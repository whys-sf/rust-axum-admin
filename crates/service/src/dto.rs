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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
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

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct LoginReq {
    #[validate(length(min = 2, max = 64))]
    pub tenant_code: String,
    #[validate(length(min = 3, max = 64))]
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

// ------------------------------ tenant ------------------------------

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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct StatusReq {
    pub status: i16,
}

// ------------------------------ user ------------------------------

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

// ------------------------------ role ------------------------------

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: String,
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
    #[serde(default, with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub menu_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateRoleReq {
    #[validate(length(min = 1, max = 64))]
    pub name: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    pub data_scope: Option<i16>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AssignMenusReq {
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub menu_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AssignDeptsReq {
    #[serde(with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub dept_ids: Vec<i64>,
}

// ------------------------------ menu ------------------------------

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateMenuReq {
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
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

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateMenuReq {
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
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

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MenuNode {
    #[serde(flatten)]
    pub menu: entity::menu::Model,
    #[schema(no_recursion)]
    pub children: Vec<MenuNode>,
}

// ------------------------------ dept ------------------------------

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDeptReq {
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
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

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDeptReq {
    #[serde(with = "entity::id::string_opt", default)]
    #[schema(value_type = Option<String>)]
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

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DeptNode {
    #[serde(flatten)]
    pub dept: entity::dept::Model,
    #[schema(no_recursion)]
    pub children: Vec<DeptNode>,
}

// ------------------------------ dict ------------------------------

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDictTypeReq {
    #[validate(length(min = 1, max = 64))]
    pub code: String,
    #[validate(length(min = 1, max = 128))]
    pub name: String,
    #[serde(default)]
    pub is_tree: bool,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDictTypeReq {
    #[validate(length(min = 1, max = 128))]
    pub name: Option<String>,
    pub is_tree: Option<bool>,
    pub status: Option<i16>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DictTypeQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub code: Option<String>,
    pub name: Option<String>,
    pub status: Option<i16>,
}

impl DictTypeQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreateDictItemReq {
    #[validate(length(min = 1, max = 64))]
    pub dict_code: String,
    #[serde(default, with = "entity::id::string")]
    #[schema(value_type = String)]
    pub parent_id: i64,
    #[validate(length(min = 1, max = 128))]
    pub label: String,
    #[validate(length(min = 1, max = 128))]
    pub value: String,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 64))]
    pub css_class: Option<String>,
    #[validate(length(max = 64))]
    pub list_class: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateDictItemReq {
    #[serde(default, with = "entity::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub parent_id: Option<i64>,
    #[validate(length(min = 1, max = 128))]
    pub label: Option<String>,
    #[validate(length(min = 1, max = 128))]
    pub value: Option<String>,
    pub sort: Option<i32>,
    pub status: Option<i16>,
    #[validate(length(max = 64))]
    pub css_class: Option<String>,
    #[validate(length(max = 64))]
    pub list_class: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
}

/// A dictionary item plus its children. Flat dictionaries return all items as
/// roots with empty `children`; tree dictionaries nest them.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DictItemNode {
    #[serde(flatten)]
    pub item: entity::dict_item::Model,
    #[schema(no_recursion)]
    pub children: Vec<DictItemNode>,
}

// ------------------------------ post ------------------------------

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

// ------------------------------ param ------------------------------

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

// ------------------------------ notice ------------------------------

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

// ------------------------------ config ------------------------------

/// Site-wide settings. Publicly readable (login page) and editable by admins
/// with `system:config:edit`.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AppSettings {
    pub site_name: String,
    pub login_title: String,
    pub login_subtitle: String,
    /// Login page background image URL (empty = default gradient).
    pub login_background: String,
    /// Sidebar / login logo image URL (empty = default icon).
    pub logo_url: String,
}

/// Partial update: only the provided fields are written.
#[derive(Debug, Default, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateSettingsReq {
    #[validate(length(max = 128))]
    pub site_name: Option<String>,
    #[validate(length(max = 128))]
    pub login_title: Option<String>,
    #[validate(length(max = 255))]
    pub login_subtitle: Option<String>,
    #[validate(length(max = 1024))]
    pub login_background: Option<String>,
    #[validate(length(max = 1024))]
    pub logo_url: Option<String>,
}

// ------------------------------ message ------------------------------

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct SendMessageReq {
    #[validate(length(min = 1, max = 255))]
    pub title: String,
    pub content: Option<String>,
    pub msg_type: Option<i16>,
    /// Target user ids. Empty = broadcast to every active user in the tenant.
    #[serde(default, with = "entity::id::string_vec")]
    #[schema(value_type = Vec<String>)]
    pub receiver_ids: Vec<i64>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct MessageQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub title: Option<String>,
}

impl MessageQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct InboxQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    /// When `true`, only unread messages are returned.
    pub unread_only: Option<bool>,
}

impl InboxQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

/// One message in the current user's inbox (joins message + receiver state).
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct InboxItem {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub message_id: i64,
    pub title: String,
    pub content: String,
    pub msg_type: i16,
    #[serde(with = "entity::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub sender_id: Option<i64>,
    pub sender_name: Option<String>,
    pub is_read: bool,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// A sent message in the admin list, with recipient/read aggregates.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct SentMessageItem {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    pub title: String,
    pub content: String,
    pub msg_type: i16,
    #[serde(with = "entity::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub sender_id: Option<i64>,
    pub sender_name: Option<String>,
    pub total: u64,
    pub read: u64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UnreadCount {
    pub count: u64,
}

// ------------------------------ job ------------------------------

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

// --------------------------- code generator ---------------------------

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct GenTableQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub table_name: Option<String>,
}

impl GenTableQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

/// A physical table available in the database for import.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DbTableInfo {
    pub table_name: String,
    pub comment: String,
    /// Whether this table has already been imported into the generator.
    pub imported: bool,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct ImportTablesReq {
    #[validate(length(min = 1))]
    pub table_names: Vec<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct GenColumnReq {
    #[serde(with = "entity::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    pub column_comment: Option<String>,
    pub is_required: Option<bool>,
    pub is_insert: Option<bool>,
    pub is_edit: Option<bool>,
    pub is_list: Option<bool>,
    pub is_query: Option<bool>,
    pub sort: Option<i32>,
}

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateGenTableReq {
    #[validate(length(min = 1, max = 128))]
    pub class_name: Option<String>,
    #[validate(length(min = 1, max = 64))]
    pub module_name: Option<String>,
    #[validate(length(min = 1, max = 64))]
    pub function_name: Option<String>,
    #[validate(length(max = 255))]
    pub remark: Option<String>,
    #[serde(default)]
    pub columns: Vec<GenColumnReq>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct GenTableDetail {
    pub table: entity::gen_table::Model,
    pub columns: Vec<entity::gen_column::Model>,
}

/// A single generated source file.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct GenFile {
    pub path: String,
    pub language: String,
    pub content: String,
}

// ------------------------------ file ------------------------------

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct FileQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub original_name: Option<String>,
}

impl FileQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

/// A stored file plus its resolved access URL.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct FileView {
    #[serde(flatten)]
    pub file: entity::file::Model,
    /// Relative URL to fetch the file (public proxy for public files, otherwise
    /// the authenticated download endpoint).
    pub url: String,
}

impl FileView {
    pub fn new(file: entity::file::Model) -> Self {
        let url = if file.is_public {
            format!("/api/v1/public/files/{}", file.id)
        } else {
            format!("/api/v1/files/{}/download", file.id)
        };
        Self { file, url }
    }
}

/// The raw bytes + metadata of a file fetched for download.
#[derive(Debug, Clone)]
pub struct FileContent {
    pub original_name: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
}

// ------------------------------ online / monitor ------------------------------

/// One live login session, surfaced in the online-users list.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct OnlineUser {
    /// Session token id (the access-token jti); used as the force-logout key.
    pub token: String,
    pub user_id: String,
    pub username: String,
    pub tenant_id: String,
    pub is_platform: bool,
    pub ip: Option<String>,
    pub login_at: String,
}

/// Host / process resource snapshot.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct ServerStat {
    pub cpu_usage: f32,
    pub cpu_cores: usize,
    pub mem_total: u64,
    pub mem_used: u64,
    pub swap_total: u64,
    pub swap_used: u64,
    pub disk_total: u64,
    pub disk_used: u64,
    pub uptime_secs: u64,
    pub os_name: String,
    pub kernel_version: String,
    pub host_name: String,
    pub process_mem: u64,
}

/// Selected Redis `INFO` fields for cache monitoring.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct CacheStat {
    pub version: String,
    pub mode: String,
    pub uptime_secs: u64,
    pub connected_clients: u64,
    pub used_memory: u64,
    pub used_memory_human: String,
    pub max_memory: u64,
    pub total_commands: u64,
    pub keyspace_hits: u64,
    pub keyspace_misses: u64,
    pub db_size: i64,
}
