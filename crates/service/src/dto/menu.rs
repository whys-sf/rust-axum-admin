use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateMenuReq {
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    pub r#type: i16,
    pub path: Option<String>,
    pub component: Option<String>,
    pub perm: Option<String>,
    pub api_path: Option<String>,
    pub api_method: Option<String>,
    pub icon: Option<String>,
    pub sort: Option<i32>,
    pub visible: Option<i16>,
    pub status: Option<i16>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateMenuReq {
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub r#type: Option<i16>,
    pub path: Option<String>,
    pub component: Option<String>,
    pub perm: Option<String>,
    pub api_path: Option<String>,
    pub api_method: Option<String>,
    pub icon: Option<Option<String>>,
    pub sort: Option<i32>,
    pub visible: Option<i16>,
    pub status: Option<i16>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MenuNode {
    #[serde(flatten)]
    pub menu: entity::menu::Model,
    #[schema(no_recursion)]
    pub children: Vec<MenuNode>,
}
