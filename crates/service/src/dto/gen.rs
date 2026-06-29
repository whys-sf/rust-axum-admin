use serde::{Deserialize, Serialize};
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct GenTableQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub table_name: Option<String>,
}

impl GenTableQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

/// A physical table available in the database for import.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DbTableInfo {
    pub table_name: String,
    pub comment: String,
    /// Whether this table has already been imported into the generator.
    pub imported: bool,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct ImportTablesReq {
    #[validate(length(min = 1))]
    pub table_names: Vec<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct GenColumnReq {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    pub column_comment: Option<String>,
    pub is_required: Option<bool>,
    pub is_insert: Option<bool>,
    pub is_edit: Option<bool>,
    pub is_list: Option<bool>,
    pub is_query: Option<bool>,
    pub sort: Option<i32>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateGenTableReq {
    #[validate(length(min = 1, max = 128))]
    pub class_name: Option<String>,
    #[validate(length(min = 1, max = 64))]
    pub module_name: Option<String>,
    #[validate(length(min = 1, max = 64))]
    pub function_name: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
    #[serde(default)]
    pub columns: Vec<GenColumnReq>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct GenTableDetail {
    pub table: entity::gen_table::Model,
    pub columns: Vec<entity::gen_column::Model>,
}

/// A single generated source file.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct GenFile {
    pub path: String,
    pub language: String,
    pub content: String,
}
