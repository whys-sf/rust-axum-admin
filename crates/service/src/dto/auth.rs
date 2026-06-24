use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct LoginReq {
    #[validate(length(min = 2, max = 64))]
    pub tenant_code: String,
    #[validate(length(min = 1, max = 64))]
    pub username: String,
    #[validate(length(min = 6, max = 64))]
    pub password: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct LoginResp {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RefreshReq {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserInfoResp {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    pub username: String,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    pub tenant_name: String,
    pub is_platform: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
}
