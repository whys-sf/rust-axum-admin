use serde::Serialize;

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
