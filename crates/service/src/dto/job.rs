use serde::Deserialize;
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct JobQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl JobQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateJobReq {
    #[validate(length(min = 1, max = 128))]
    pub name: String,
    #[validate(length(max = 64))]
    pub job_group: Option<String>,
    #[validate(length(min = 1, max = 128))]
    pub invoke_target: String,
    #[validate(length(min = 1, max = 64))]
    pub cron_expr: String,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateJobReq {
    #[validate(length(min = 1, max = 128))]
    pub name: Option<String>,
    #[validate(length(max = 64))]
    pub job_group: Option<String>,
    #[validate(length(min = 1, max = 128))]
    pub invoke_target: Option<String>,
    #[validate(length(min = 1, max = 64))]
    pub cron_expr: Option<String>,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct SetJobStatusReq {
    /// 0 = 暂停, 1 = 运行中.
    pub status: i16,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct JobLogQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub job_id: Option<i64>,
    pub status: Option<i16>,
}

impl JobLogQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}
