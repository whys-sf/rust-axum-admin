use std::sync::Arc;

use common::config::Settings;
use server::{build_app, init_state};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,sqlx=warn".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let settings = Arc::new(Settings::load()?);
    let addr = settings.server.addr.clone();

    let state = init_state(settings).await?;
    let app = build_app(state);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("admin-backend listening on http://{addr}");
    axum::serve(listener, app).await?;

    Ok(())
}
