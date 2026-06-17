use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sys_tenant")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: i64,
    pub name: String,
    #[sea_orm(unique)]
    pub code: String,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub domain: Option<String>,
    pub package_id: Option<i64>,
    pub user_limit: i32,
    pub status: i16,
    pub expire_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
