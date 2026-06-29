use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = MessageModel)]
#[sea_orm(table_name = "sys_message")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    /// Sender user id; `None` for system-generated messages.
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub sender_id: Option<i64>,
    pub title: String,
    pub content: String,
    /// 1 = 系统通知, 2 = 个人站内信.
    pub msg_type: i16,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
