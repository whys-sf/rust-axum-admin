use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = GenColumnModel)]
#[sea_orm(table_name = "sys_gen_column")]
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
    pub table_id: i64,
    pub column_name: String,
    pub column_comment: String,
    /// Raw SQL data type from information_schema, e.g. `bigint`, `character varying`.
    pub column_type: String,
    /// Mapped Rust type, e.g. `i64`, `String`, `Option<DateTime<Utc>>`.
    pub rust_type: String,
    /// Mapped TypeScript type, e.g. `string`, `number`, `boolean`.
    pub ts_type: String,
    pub is_pk: bool,
    pub is_required: bool,
    pub is_insert: bool,
    pub is_edit: bool,
    pub is_list: bool,
    pub is_query: bool,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
