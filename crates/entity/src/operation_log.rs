use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = OperationLogModel)]
#[sea_orm(table_name = "sys_operation_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub tenant_id: Option<i64>,
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub user_id: Option<i64>,
    pub username: Option<String>,
    pub module: Option<String>,
    pub action: Option<String>,
    pub method: Option<String>,
    pub path: Option<String>,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    pub request_body: Option<String>,
    pub status_code: Option<i32>,
    pub duration_ms: Option<i64>,
    pub error_msg: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
