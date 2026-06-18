use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = DeptModel)]
#[sea_orm(table_name = "sys_dept")]
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
    pub parent_id: i64,
    /// Comma-separated ancestor ids from the root sentinel `0` down to the
    /// parent, e.g. `0,100,101`. Enables cheap subtree queries.
    pub ancestors: String,
    pub name: String,
    pub sort: i32,
    pub leader: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub status: i16,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
