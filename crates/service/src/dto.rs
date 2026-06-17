use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

/// Identity of the caller, resolved from the JWT by the auth middleware.
#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: i64,
    pub username: String,
    pub tenant_id: i64,
    pub is_platform: bool,
    pub roles: Vec<String>,
}

impl CurrentUser {
    /// The tenant whose data this request operates on. Platform admins may
    /// override it via the `X-Tenant-Id` header (resolved in middleware).
    pub fn acting_tenant(&self) -> i64 {
        self.tenant_id
    }
}

fn default_page() -> u64 {
    1
}
fn default_page_size() -> u64 {
    10
}

/// Deserialize a `u64` that may arrive as a string. Required because
/// `axum::extract::Query` uses `serde_urlencoded`, which surfaces all values as
/// strings when a struct uses `#[serde(flatten)]`.
fn de_u64<'de, D>(d: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct V;
    impl serde::de::Visitor<'_> for V {
        type Value = u64;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a u64 or its string representation")
        }
        fn visit_u64<E>(self, v: u64) -> Result<u64, E> {
            Ok(v)
        }
        fn visit_i64<E>(self, v: i64) -> Result<u64, E> {
            Ok(v.max(0) as u64)
        }
        fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<u64, E> {
            v.parse().map_err(serde::de::Error::custom)
        }
    }
    d.deserialize_any(V)
}

#[derive(Debug, Deserialize)]
pub struct PageQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
}

impl PageQuery {
    pub fn new(page: u64, page_size: u64) -> Self {
        Self { page, page_size }
    }

    pub fn normalized(&self) -> (u64, u64) {
        let page = self.page.max(1);
        let page_size = self.page_size.clamp(1, 200);
        (page, page_size)
    }
}

// ------------------------------ auth ------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct LoginReq {
    #[validate(length(min = 2, max = 64))]
    pub tenant_code: String,
    #[validate(length(min = 3, max = 64))]
    pub username: String,
    #[validate(length(min = 6, max = 64))]
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResp {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshReq {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct UserInfoResp {
    pub id: i64,
    pub username: String,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    pub tenant_id: i64,
    pub tenant_name: String,
    pub is_platform: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
}

// ------------------------------ tenant ------------------------------

#[derive(Debug, Deserialize, Validate)]
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

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateTenantReq {
    #[validate(length(min = 2, max = 128))]
    pub name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub user_limit: Option<i32>,
    pub expire_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StatusReq {
    pub status: i16,
}

// ------------------------------ user ------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserReq {
    #[validate(length(min = 3, max = 64))]
    pub username: String,
    #[validate(length(min = 6, max = 64))]
    pub password: String,
    pub nickname: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub phone: Option<String>,
    pub dept_id: Option<i64>,
    #[serde(default)]
    pub role_ids: Vec<i64>,
    pub status: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserReq {
    pub nickname: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub phone: Option<String>,
    pub dept_id: Option<i64>,
    pub status: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Deserialize)]
pub struct AssignRolesReq {
    pub role_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResetPasswordReq {
    #[validate(length(min = 6, max = 64))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordReq {
    pub old_password: String,
    #[validate(length(min = 6, max = 64))]
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct UserDetail {
    #[serde(flatten)]
    pub user: entity::user::Model,
    pub role_ids: Vec<i64>,
}

// ------------------------------ role ------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
    #[serde(default)]
    pub menu_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RoleQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl RoleQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize)]
pub struct AssignMenusReq {
    pub menu_ids: Vec<i64>,
}

// ------------------------------ menu ------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMenuReq {
    #[serde(default)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    pub r#type: i16,
    pub path: Option<String>,
    pub component: Option<String>,
    pub perm: Option<String>,
    pub api_path: Option<String>,
    pub api_method: Option<String>,
    pub icon: Option<String>,
    pub sort: Option<i32>,
    pub visible: Option<i16>,
    pub status: Option<i16>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMenuReq {
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub r#type: Option<i16>,
    pub path: Option<String>,
    pub component: Option<String>,
    pub perm: Option<String>,
    pub api_path: Option<String>,
    pub api_method: Option<String>,
    pub icon: Option<String>,
    pub sort: Option<i32>,
    pub visible: Option<i16>,
    pub status: Option<i16>,
}

#[derive(Debug, Serialize)]
pub struct MenuNode {
    #[serde(flatten)]
    pub menu: entity::menu::Model,
    pub children: Vec<MenuNode>,
}

// ------------------------------ dept ------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct CreateDeptReq {
    #[serde(default)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    pub sort: Option<i32>,
    pub leader: Option<String>,
    pub phone: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub status: Option<i16>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateDeptReq {
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub leader: Option<String>,
    pub phone: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    pub status: Option<i16>,
}

#[derive(Debug, Serialize)]
pub struct DeptNode {
    #[serde(flatten)]
    pub dept: entity::dept::Model,
    pub children: Vec<DeptNode>,
}
