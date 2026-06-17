use std::sync::Arc;

use casbin::{CoreApi, DefaultModel, Enforcer};
use service::SharedEnforcer;
use sqlx_adapter::SqlxAdapter;
use tokio::sync::RwLock;

/// Initialise the casbin enforcer backed by the postgres `casbin_rule` table.
/// The adapter creates the table on first use.
pub async fn init_enforcer(model_path: &str, db_url: &str) -> anyhow::Result<SharedEnforcer> {
    let model = DefaultModel::from_file(model_path).await?;
    let adapter = SqlxAdapter::new(db_url.to_owned(), 8).await?;
    let mut enforcer = Enforcer::new(model, adapter).await?;
    enforcer.enable_auto_save(true);
    Ok(Arc::new(RwLock::new(enforcer)))
}
