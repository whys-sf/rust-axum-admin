use serde::Deserialize;
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PostQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub code: Option<String>,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl PostQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreatePostReq {
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    #[validate(length(min = 1, max = 128))]
    pub name: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdatePostReq {
    #[validate(length(min = 1, max = 128))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}
