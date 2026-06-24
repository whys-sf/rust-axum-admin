use serde::{Deserialize, Serialize};
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDictTypeReq {
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    #[validate(length(min = 1, max = 128))]
    pub name: String,
    #[serde(default)]
    pub is_tree: bool,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDictTypeReq {
    #[validate(length(min = 1, max = 128))]
    pub name: Option<String>,
    pub is_tree: Option<bool>,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DictTypeQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub code: Option<String>,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl DictTypeQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDictItemReq {
    #[validate(length(min = 1, max = 64))]
    pub dict_code: String,
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 128))]
    pub label: String,
    #[validate(length(min = 1, max = 128))]
    pub value: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 64))]
    pub css_class: Option<String>,
    #[validate(length(max = 64))]
    pub list_class: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDictItemReq {
    #[serde(default, with = "entity::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 128))]
    pub label: Option<String>,
    #[validate(length(min = 1, max = 128))]
    pub value: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 64))]
    pub css_class: Option<String>,
    #[validate(length(max = 64))]
    pub list_class: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

/// A dictionary item plus its children. Flat dictionaries return all items as
/// roots with empty `children`; tree dictionaries nest them.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DictItemNode {
    #[serde(flatten)]
    pub item: entity::dict_item::Model,
    #[schema(no_recursion)]
    pub children: Vec<DictItemNode>,
}
