use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = FileModel)]
#[sea_orm(table_name = "sys_file")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    /// Original filename as uploaded by the client.
    pub original_name: String,
    /// Object key inside the bucket.
    pub object_key: String,
    pub content_type: String,
    pub size: i64,
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub folder_id: Option<i64>,
    /// Public files are reachable without authentication (used for logos /
    /// login backgrounds); private files require an authenticated download.
    pub is_public: bool,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
