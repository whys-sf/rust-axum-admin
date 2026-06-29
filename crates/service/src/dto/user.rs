use serde::{Deserialize, Serialize};
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateUserReq {
    #[validate(length(min = 3, max = 64))]
    pub username: String,
    #[validate(length(min = 6, max = 64))]
    pub password: String,
    pub nickname: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
    pub dept_id: Option<i64>,
    #[serde(default, with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub role_ids: Vec<i64>,
    pub status: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateUserReq {
    pub nickname: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
    pub dept_id: Option<i64>,
    pub status: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UserQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub username: Option<String>,
    pub status: Option<i16>,
    pub dept_id: Option<i64>,
}

impl UserQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AssignRolesReq {
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub role_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct ResetPasswordReq {
    #[validate(length(min = 6, max = 64))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct ChangePasswordReq {
    pub old_password: String,
    #[validate(length(min = 6, max = 64))]
    pub new_password: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserDetail {
    #[serde(flatten)]
    pub user: entity::user::Model,
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub role_ids: Vec<i64>,
}
