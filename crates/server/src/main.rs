mod extract;
mod handlers;
mod infra;
mod middleware;
mod routes;
mod state;

use std::sync::Arc;
use std::time::Duration;

use common::config::Settings;
use migration::{Migrator, MigratorTrait};
use service::{permission, Services};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,sqlx=warn".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let settings = Arc::new(Settings::load()?);

    // infrastructure
    let db = infra::db::connect(&settings.database.url, settings.database.max_connections).await?;
    Migrator::up(&db, None).await?;

    let redis = common::redis::create_pool(&settings.redis.url)?;
    let enforcer = infra::casbin::init_enforcer(&settings.casbin.model_path, &settings.database.url).await?;

    // load all policies from the database into the enforcer
    permission::rebuild_all(&db, &enforcer).await?;

    let services = Services::new(db, redis, enforcer, settings.clone());
    let state = AppState { services };

    let app = routes::api_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
                .max_age(Duration::from_secs(3600)),
        );

    let addr = settings.server.addr.clone();
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("admin-backend listening on http://{addr}");
    axum::serve(listener, app).await?;

    Ok(())
}
