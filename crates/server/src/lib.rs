pub mod extract;
pub mod handlers;
pub mod infra;
pub mod middleware;
pub mod openapi;
pub mod routes;
pub mod state;

use std::sync::Arc;
use std::time::Duration;

use axum::http::HeaderValue;
use common::config::Settings;
use migration::{Migrator, MigratorTrait};
use service::{permission, Services};
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

use crate::state::AppState;

/// Build the CORS layer from configuration. `["*"]` (or an empty list) allows
/// any origin; otherwise only the configured origins are reflected.
fn cors_layer(origins: &[String]) -> CorsLayer {
    let base = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    if origins.is_empty() || origins.iter().any(|o| o == "*") {
        base.allow_origin(Any)
    } else {
        let parsed: Vec<HeaderValue> = origins
            .iter()
            .filter_map(|o| o.parse::<HeaderValue>().ok())
            .collect();
        base.allow_origin(AllowOrigin::list(parsed))
    }
}

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

/// Assemble the axum router with the global middleware (tracing, CORS, request
/// body-size limit and per-request timeout).
pub fn build_app(state: AppState) -> axum::Router {
    let server = &state.services.settings.server;
    let cors = cors_layer(&server.cors_allowed_origins);
    let body_limit = server.request_body_limit;
    let timeout = Duration::from_secs(server.request_timeout_secs);

    routes::api_router(state.clone())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            timeout,
        ))
        .layer(RequestBodyLimitLayer::new(body_limit))
}
