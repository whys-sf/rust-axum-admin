use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub jwt: JwtConfig,
    pub snowflake: SnowflakeConfig,
    pub casbin: CasbinConfig,
    #[serde(default)]
    pub tenant: TenantConfig,
    #[serde(default)]
    pub storage: StorageConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub addr: String,
    /// CORS allow-list. `["*"]` allows any origin (dev only); otherwise only the
    /// listed origins are reflected.
    #[serde(default = "default_cors_origins")]
    pub cors_allowed_origins: Vec<String>,
    /// Whether to mount `/swagger-ui` and `/api-docs/openapi.json`. Disable in
    /// production to avoid leaking the API surface.
    #[serde(default = "default_true")]
    pub enable_swagger: bool,
    /// Trust the `X-Forwarded-For` / `X-Real-Ip` headers for client-ip. Only
    /// enable when running behind a trusted reverse proxy/load balancer.
    #[serde(default)]
    pub trust_forwarded_for: bool,
    /// Maximum accepted request body size in bytes.
    #[serde(default = "default_body_limit")]
    pub request_body_limit: usize,
    /// Per-request timeout in seconds.
    #[serde(default = "default_request_timeout")]
    pub request_timeout_secs: u64,
    /// Run database migrations during application startup.
    #[serde(default = "default_true")]
    pub auto_migrate: bool,
    /// Start the in-process background job scheduler.
    #[serde(default = "default_true")]
    pub enable_scheduler: bool,
    /// Maximum accepted upload (multipart) body size in bytes. Larger than
    /// `request_body_limit` since attachments can be sizeable.
    #[serde(default = "default_upload_limit")]
    pub upload_body_limit: usize,
}

fn default_upload_limit() -> usize {
    20 * 1024 * 1024
}

/// S3-compatible object storage (MinIO by default) used for file attachments.
#[derive(Debug, Clone, Deserialize)]
pub struct StorageConfig {
    #[serde(default = "default_s3_endpoint")]
    pub endpoint: String,
    #[serde(default = "default_s3_region")]
    pub region: String,
    #[serde(default = "default_s3_bucket")]
    pub bucket: String,
    #[serde(default = "default_s3_key")]
    pub access_key: String,
    #[serde(default = "default_s3_secret")]
    pub secret_key: String,
    /// Use path-style addressing (`endpoint/bucket/key`). Required for MinIO.
    #[serde(default = "default_true")]
    pub path_style: bool,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            endpoint: default_s3_endpoint(),
            region: default_s3_region(),
            bucket: default_s3_bucket(),
            access_key: default_s3_key(),
            secret_key: default_s3_secret(),
            path_style: true,
        }
    }
}

fn default_s3_endpoint() -> String {
    "http://localhost:9000".to_string()
}
fn default_s3_region() -> String {
    "us-east-1".to_string()
}
fn default_s3_bucket() -> String {
    "admin".to_string()
}
fn default_s3_key() -> String {
    "minioadmin".to_string()
}
fn default_s3_secret() -> String {
    "minioadmin".to_string()
}

fn default_cors_origins() -> Vec<String> {
    vec!["*".to_string()]
}

fn default_true() -> bool {
    true
}

fn default_body_limit() -> usize {
    1024 * 1024
}

fn default_request_timeout() -> u64 {
    30
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

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TenantMode {
    Single,
    Multi,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TenantConfig {
    #[serde(default)]
    pub mode: TenantMode,
    #[serde(default = "default_tenant_id")]
    pub default_tenant_id: i64,
    #[serde(default = "default_tenant_code")]
    pub default_tenant_code: String,
    #[serde(default)]
    pub show_tenant_login: bool,
    #[serde(default)]
    pub enable_platform_console: bool,
}

impl TenantConfig {
    pub fn is_single(&self) -> bool {
        self.mode == TenantMode::Single
    }

    pub fn is_multi(&self) -> bool {
        self.mode == TenantMode::Multi
    }
}

impl Default for TenantMode {
    fn default() -> Self {
        Self::Single
    }
}

impl Default for TenantConfig {
    fn default() -> Self {
        Self {
            mode: TenantMode::Single,
            default_tenant_id: default_tenant_id(),
            default_tenant_code: default_tenant_code(),
            show_tenant_login: false,
            enable_platform_console: false,
        }
    }
}

fn default_tenant_id() -> i64 {
    1000
}

fn default_tenant_code() -> String {
    "demo".to_string()
}

/// The placeholder secret shipped in `config/default.toml`. Refusing it forces
/// every real deployment to supply its own.
pub const DEFAULT_JWT_SECRET: &str = "change_me_to_a_long_random_secret_string_at_least_32_chars";
const MIN_JWT_SECRET_LEN: usize = 32;

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

        parsed.validate()?;
        Ok(parsed)
    }

    /// Reject insecure configuration before the app starts.
    pub fn validate(&self) -> anyhow::Result<()> {
        if self.jwt.secret == DEFAULT_JWT_SECRET {
            anyhow::bail!(
                "jwt.secret is still the default placeholder; set JWT__SECRET to a unique secret"
            );
        }
        if self.jwt.secret.len() < MIN_JWT_SECRET_LEN {
            anyhow::bail!(
                "jwt.secret must be at least {MIN_JWT_SECRET_LEN} characters (got {})",
                self.jwt.secret.len()
            );
        }
        if self.tenant.is_single() && self.tenant.default_tenant_id == 0 {
            anyhow::bail!("tenant.default_tenant_id must not be 0 in single-tenant mode");
        }
        if self.tenant.is_single() && self.tenant.default_tenant_code.trim().is_empty() {
            anyhow::bail!("tenant.default_tenant_code is required in single-tenant mode");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings_with_secret(secret: &str) -> Settings {
        Settings {
            server: ServerConfig {
                addr: "127.0.0.1:0".into(),
                cors_allowed_origins: default_cors_origins(),
                enable_swagger: true,
                trust_forwarded_for: false,
                request_body_limit: default_body_limit(),
                request_timeout_secs: default_request_timeout(),
                auto_migrate: true,
                enable_scheduler: true,
                upload_body_limit: default_upload_limit(),
            },
            database: DatabaseConfig {
                url: "postgres://localhost/x".into(),
                max_connections: 1,
            },
            redis: RedisConfig {
                url: "redis://localhost".into(),
            },
            jwt: JwtConfig {
                secret: secret.into(),
                access_ttl: 900,
                refresh_ttl: 604800,
            },
            snowflake: SnowflakeConfig {
                worker_id: 1,
                datacenter_id: 1,
            },
            casbin: CasbinConfig {
                model_path: "rbac_model.conf".into(),
            },
            tenant: TenantConfig::default(),
            storage: StorageConfig::default(),
        }
    }

    #[test]
    fn rejects_default_and_short_secrets() {
        assert!(settings_with_secret(DEFAULT_JWT_SECRET).validate().is_err());
        assert!(settings_with_secret("too_short").validate().is_err());
        assert!(
            settings_with_secret("a_sufficiently_long_unique_secret_value")
                .validate()
                .is_ok()
        );
    }
}
