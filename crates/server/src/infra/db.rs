use std::time::Duration;

use sea_orm::{ConnectOptions, Database, DatabaseConnection};

/// Open a pooled connection to PostgreSQL.
pub async fn connect(url: &str, max_connections: u32) -> anyhow::Result<DatabaseConnection> {
    let mut opt = ConnectOptions::new(url.to_owned());
    opt.max_connections(max_connections)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .sqlx_logging(false);
    let conn = Database::connect(opt).await?;
    Ok(conn)
}
