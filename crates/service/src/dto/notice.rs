use serde::Deserialize;
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct NoticeQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub title: Option<String>,
    pub notice_type: Option<i16>,
    pub status: Option<i16>,
}

impl NoticeQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateNoticeReq {
    #[validate(length(min = 1, max = 255))]
    pub title: String,
    pub notice_type: Option<i16>,
    pub content: Option<String>,
    pub status: Option<i16>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateNoticeReq {
    #[validate(length(min = 1, max = 255))]
    pub title: Option<String>,
    pub notice_type: Option<i16>,
    pub content: Option<String>,
    pub status: Option<i16>,
}
