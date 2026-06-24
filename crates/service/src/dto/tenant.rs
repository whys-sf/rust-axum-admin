use chrono::{DateTime, Utc};
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateTenantReq {
    #[validate(length(min = 2, max = 128))]
    pub name: String,
    #[validate(length(min = 2, max = 64))]
    pub code: String,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub user_limit: Option<i32>,
    pub expire_at: Option<DateTime<Utc>>,
    #[validate(length(min = 3, max = 64))]
    pub admin_username: String,
    #[validate(length(min = 6, max = 64))]
    pub admin_password: String,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateTenantReq {
    #[validate(length(min = 2, max = 128))]
    pub name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub user_limit: Option<i32>,
    pub expire_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
}
