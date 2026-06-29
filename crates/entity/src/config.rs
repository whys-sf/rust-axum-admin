use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = ConfigModel)]
#[sea_orm(table_name = "sys_config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub tenant_id: i64,
    #[sea_orm(primary_key, auto_increment = false)]
    pub config_key: String,
    pub config_value: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
