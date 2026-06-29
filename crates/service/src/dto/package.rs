use chrono::{DateTime, Utc};
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Clone, serde::Serialize, utoipa::ToSchema)]
pub struct PackageResp {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: i16,
    pub sort: i32,
    pub default_user_limit: i32,
    pub feature_codes: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreatePackageReq {
    #[validate(length(min = 2, max = 64))]
    pub code: String,
    #[validate(length(min = 2, max = 64))]
    pub name: String,
    #[validate(length(max = 255))]
    pub description: Option<String>,
    pub status: Option<i16>,
    pub sort: Option<i32>,
    pub default_user_limit: Option<i32>,
    pub feature_codes: Vec<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdatePackageReq {
    #[validate(length(min = 2, max = 64))]
    pub name: Option<String>,
    #[validate(length(max = 255))]
    pub description: Option<String>,
    pub status: Option<i16>,
    pub sort: Option<i32>,
    pub default_user_limit: Option<i32>,
    pub feature_codes: Option<Vec<String>>,
}
