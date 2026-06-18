use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = JobLogModel)]
#[sea_orm(table_name = "sys_job_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub job_id: i64,
    pub job_name: String,
    pub invoke_target: String,
    /// 0 = 失败, 1 = 成功.
    pub status: i16,
    pub message: String,
    pub started_at: DateTime<Utc>,
    pub duration_ms: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
