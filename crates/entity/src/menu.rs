use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = MenuModel)]
#[sea_orm(table_name = "sys_menu")]
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
    pub name: String,
    pub r#type: i16,
    pub path: Option<String>,
    pub component: Option<String>,
    pub perm: Option<String>,
    pub api_path: Option<String>,
    pub api_method: Option<String>,
    pub icon: Option<String>,
    pub sort: i32,
    pub visible: i16,
    pub status: i16,
    pub is_cache: i16,
    pub is_external: i16,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
