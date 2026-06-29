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
    #[validate(length(max = 128))]
    pub domain: Option<String>,
    #[serde(with = "entity::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub package_id: Option<i64>,
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
    #[validate(length(max = 128))]
    pub domain: Option<String>,
    #[serde(
        default,
        deserialize_with = "entity::id::string_opt_update::deserialize"
    )]
    #[schema(value_type = Option<String>)]
    pub package_id: Option<Option<i64>>,
    pub user_limit: Option<i32>,
    pub expire_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
}
