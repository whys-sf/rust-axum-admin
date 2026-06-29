use serde::Deserialize;
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ParamQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub name: Option<String>,
    pub param_key: Option<String>,
}

impl ParamQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateParamReq {
    #[validate(length(min = 1, max = 128))]
    pub name: String,
    #[validate(length(min = 1, max = 128))]
    pub param_key: String,
    #[validate(length(max = 512))]
    pub param_value: String,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateParamReq {
    #[validate(length(min = 1, max = 128))]
    pub name: Option<String>,
    #[validate(length(max = 512))]
    pub param_value: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}
