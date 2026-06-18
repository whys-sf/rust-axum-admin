pub mod extract;
pub mod handlers;
pub mod infra;
pub mod middleware;
pub mod routes;
pub mod state;

use std::sync::Arc;
use std::time::Duration;

use common::config::Settings;
use migration::{Migrator, MigratorTrait};
use service::{permission, Services};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::state::AppState;

/// Build the full application state: connect to the database, run migrations,
/// create the redis pool, initialise the casbin enforcer and load all policies.
pub async fn init_state(settings: Arc<Settings>) -> anyhow::Result<AppState> {
    let db = infra::db::connect(&settings.database.url, settings.database.max_connections).await?;
    Migrator::up(&db, None).await?;

    let redis = common::redis::create_pool(&settings.redis.url)?;
    let enforcer =
        infra::casbin::init_enforcer(&settings.casbin.model_path, &settings.database.url).await?;
    permission::rebuild_all(&db, &enforcer).await?;

    let services = Services::new(db, redis, enforcer, settings.clone());
    Ok(AppState { services })
}

/// Assemble the axum router with the global middleware (tracing + CORS).
pub fn build_app(state: AppState) -> axum::Router {
    routes::api_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
                .max_age(Duration::from_secs(3600)),
        )
}
