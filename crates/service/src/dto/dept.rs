use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDeptReq {
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    pub sort: Option<i32>,
    pub leader: Option<String>,
    pub phone: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub status: Option<i16>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDeptReq {
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub leader: Option<String>,
    pub phone: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub status: Option<i16>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DeptNode {
    #[serde(flatten)]
    pub dept: entity::dept::Model,
    #[schema(no_recursion)]
    pub children: Vec<DeptNode>,
}
