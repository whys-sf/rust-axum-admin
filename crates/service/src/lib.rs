pub mod auth;
pub mod config;
pub mod data_scope;
pub mod dept;
pub mod dict;
pub mod dto;
pub mod feature;
pub mod file;
pub mod gen;
pub mod job;
pub mod log;
pub mod menu;
pub mod message;
pub mod monitor;
pub mod notice;
pub mod online;
pub mod package;
pub mod param;
pub mod permission;
pub mod post;
pub mod role;
pub mod tenant;
pub mod user;

use std::sync::Arc;

use casbin::Enforcer;
use common::config::Settings;
use common::jwt::JwtService;
use common::redis::RedisPool;
use common::snowflake::Snowflake;
use sea_orm::DatabaseConnection;
use tokio::sync::RwLock;

pub type SharedEnforcer = Arc<RwLock<Enforcer>>;

/// Aggregates every dependency the service layer needs. The HTTP layer holds a
/// clone of this inside its `AppState`.
#[derive(Clone)]
pub struct Services {
    pub db: DatabaseConnection,
    pub redis: RedisPool,
    pub jwt: JwtService,
    pub snowflake: Arc<Snowflake>,
    pub enforcer: SharedEnforcer,
    pub settings: Arc<Settings>,
}

impl Services {
    pub fn new(
        db: DatabaseConnection,
        redis: RedisPool,
        enforcer: SharedEnforcer,
        settings: Arc<Settings>,
    ) -> Self {
        let jwt = JwtService::new(
            settings.jwt.secret.clone(),
            settings.jwt.access_ttl,
            settings.jwt.refresh_ttl,
        );
        let snowflake = Arc::new(Snowflake::new(
            settings.snowflake.worker_id,
            settings.snowflake.datacenter_id,
        ));
        Self {
            db,
            redis,
            jwt,
            snowflake,
            enforcer,
            settings,
        }
    }

    pub fn next_id(&self) -> i64 {
        self.snowflake.next_id()
    }
}

/// The reserved platform tenant id. Users with this tenant are platform-level.
pub const PLATFORM_TENANT_ID: i64 = 0;
