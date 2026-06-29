use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = DictItemModel)]
#[sea_orm(table_name = "sys_dict_item")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    /// References `sys_dict_type.code` (within the same tenant).
    pub dict_code: String,
    /// `0` for top-level items; for tree dictionaries this nests items.
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub parent_id: i64,
    pub label: String,
    pub value: String,
    pub sort: i32,
    pub status: i16,
    /// Optional CSS class for rendering the value (e.g. a colored tag).
    pub css_class: Option<String>,
    /// Optional tag variant for list rendering (e.g. `success` / `warning`).
    pub list_class: Option<String>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
