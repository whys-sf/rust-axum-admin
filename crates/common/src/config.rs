use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub jwt: JwtConfig,
    pub snowflake: SnowflakeConfig,
    pub casbin: CasbinConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub addr: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    #[serde(default = "default_max_connections")]
    pub max_connections: u32,
}

fn default_max_connections() -> u32 {
    10
}

#[derive(Debug, Clone, Deserialize)]
pub struct RedisConfig {
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwtConfig {
    pub secret: String,
    pub access_ttl: i64,
    pub refresh_ttl: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SnowflakeConfig {
    pub worker_id: i64,
    pub datacenter_id: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CasbinConfig {
    pub model_path: String,
}

impl Settings {
    /// Load configuration from `config/default.toml`, then the run-mode specific
    /// file, then environment variables. Nested keys use a double underscore
    /// separator (e.g. `SERVER__ADDR`, `JWT__SECRET`). The common flat aliases
    /// `DATABASE_URL` and `REDIS_URL` are also honored for convenience.
    pub fn load() -> anyhow::Result<Self> {
        let run_mode = std::env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let settings = config::Config::builder()
            .add_source(config::File::with_name("config/default").required(true))
            .add_source(config::File::with_name(&format!("config/{run_mode}")).required(false))
            .add_source(config::Environment::default().separator("__"))
            .build()?;

        let mut parsed: Settings = settings.try_deserialize()?;

        if let Ok(v) = std::env::var("DATABASE_URL") {
            parsed.database.url = v;
        }
        if let Ok(v) = std::env::var("REDIS_URL") {
            parsed.redis.url = v;
        }

        Ok(parsed)
    }
}
