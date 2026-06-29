use serde::Deserialize;
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
    #[serde(default, with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub menu_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct RoleQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl RoleQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AssignMenusReq {
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub menu_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AssignDeptsReq {
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub dept_ids: Vec<i64>,
}
