use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = GenTableModel)]
#[sea_orm(table_name = "sys_gen_table")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    /// Source database table name, e.g. `sys_product`.
    pub table_name: String,
    /// PascalCase entity/class name, e.g. `Product`.
    pub class_name: String,
    /// snake_case module name used for file/route names, e.g. `product`.
    pub module_name: String,
    /// Human-readable business name, e.g. `产品`.
    pub function_name: String,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
