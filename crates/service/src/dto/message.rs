use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

use super::{de_u64, default_page, default_page_size, PageQuery};

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
