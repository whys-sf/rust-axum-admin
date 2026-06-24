use serde::Deserialize;

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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct StatusReq {
    pub status: i16,
}

pub mod auth;
pub mod config;
pub mod dept;
pub mod dict;
pub mod file;
pub mod r#gen;
pub mod job;
pub mod menu;
pub mod message;
pub mod monitor;
pub mod notice;
pub mod param;
pub mod post;
pub mod role;
pub mod tenant;
pub mod user;

pub use auth::*;
pub use config::*;
pub use dept::*;
pub use dict::*;
pub use file::*;
pub use job::*;
pub use menu::*;
pub use message::*;
pub use monitor::*;
pub use notice::*;
pub use param::*;
pub use post::*;
pub use r#gen::*;
pub use role::*;
pub use tenant::*;
pub use user::*;
