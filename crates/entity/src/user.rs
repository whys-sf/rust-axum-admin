use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,
)]
#[schema(as = UserModel)]
#[sea_orm(table_name = "sys_user")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub id: i64,
    #[serde(with = "crate::id::string")]
    #[schema(value_type = String)]
    pub tenant_id: i64,
    pub username: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub nickname: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub avatar: Option<String>,
    pub gender: i16,
    pub status: i16,
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub dept_id: Option<i64>,
    pub remark: Option<String>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub last_login_ip: Option<String>,
    #[serde(with = "crate::id::string_opt")]
    #[schema(value_type = Option<String>)]
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
