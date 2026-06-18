use deadpool_redis::redis::AsyncCommands;
use deadpool_redis::{Config, Pool, Runtime};

pub type RedisPool = Pool;

/// Build a deadpool-redis connection pool from a redis URL.
pub fn create_pool(url: &str) -> anyhow::Result<RedisPool> {
    let cfg = Config::from_url(url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
    Ok(pool)
}

const BLACKLIST_PREFIX: &str = "auth:blacklist:";
const LOGIN_FAIL_PREFIX: &str = "auth:loginfail:";
const LOGIN_IP_PREFIX: &str = "auth:loginip:";
const PWD_EPOCH_PREFIX: &str = "auth:pwdepoch:";

/// Add a token jti to the blacklist with a TTL (seconds).
pub async fn blacklist_token(pool: &RedisPool, jti: &str, ttl_secs: i64) -> anyhow::Result<()> {
    if ttl_secs <= 0 {
        return Ok(());
    }
    let mut conn = pool.get().await?;
    let key = format!("{BLACKLIST_PREFIX}{jti}");
    conn.set_ex::<_, _, ()>(key, 1, ttl_secs as u64).await?;
    Ok(())
}

/// Whether a token jti is blacklisted.
pub async fn is_blacklisted(pool: &RedisPool, jti: &str) -> anyhow::Result<bool> {
    let mut conn = pool.get().await?;
    let key = format!("{BLACKLIST_PREFIX}{jti}");
    let exists: bool = conn.exists(key).await?;
    Ok(exists)
}

/// Increment the login-failure counter for a (tenant, username) pair and
/// return the new count. The counter expires after `window_secs`.
pub async fn incr_login_fail(
    pool: &RedisPool,
    tenant_id: i64,
    username: &str,
    window_secs: i64,
) -> anyhow::Result<i64> {
    let mut conn = pool.get().await?;
    let key = format!("{LOGIN_FAIL_PREFIX}{tenant_id}:{username}");
    let count: i64 = conn.incr(&key, 1).await?;
    if count == 1 {
        conn.expire::<_, ()>(&key, window_secs).await?;
    }
    Ok(count)
}

pub async fn reset_login_fail(
    pool: &RedisPool,
    tenant_id: i64,
    username: &str,
) -> anyhow::Result<()> {
    let mut conn = pool.get().await?;
    let key = format!("{LOGIN_FAIL_PREFIX}{tenant_id}:{username}");
    conn.del::<_, ()>(key).await?;
    Ok(())
}

/// Increment the per-IP login-attempt counter and return the new count. Counts
/// every attempt (success or failure) within `window_secs` to throttle
/// credential-stuffing that rotates usernames from a single source.
pub async fn incr_login_attempt_ip(
    pool: &RedisPool,
    ip: &str,
    window_secs: i64,
) -> anyhow::Result<i64> {
    let mut conn = pool.get().await?;
    let key = format!("{LOGIN_IP_PREFIX}{ip}");
    let count: i64 = conn.incr(&key, 1).await?;
    if count == 1 {
        conn.expire::<_, ()>(&key, window_secs).await?;
    }
    Ok(count)
}

/// Record that a user's password changed at `epoch` (unix seconds). Access and
/// refresh tokens issued before this are treated as invalid. Kept for
/// `ttl_secs` (the max token lifetime), after which no older token can exist.
pub async fn set_password_epoch(
    pool: &RedisPool,
    user_id: i64,
    epoch: i64,
    ttl_secs: i64,
) -> anyhow::Result<()> {
    if ttl_secs <= 0 {
        return Ok(());
    }
    let mut conn = pool.get().await?;
    let key = format!("{PWD_EPOCH_PREFIX}{user_id}");
    conn.set_ex::<_, _, ()>(key, epoch, ttl_secs as u64).await?;
    Ok(())
}

/// The unix-second epoch at which the user last changed their password, if a
/// record still exists.
pub async fn password_epoch(pool: &RedisPool, user_id: i64) -> anyhow::Result<Option<i64>> {
    let mut conn = pool.get().await?;
    let key = format!("{PWD_EPOCH_PREFIX}{user_id}");
    let epoch: Option<i64> = conn.get(key).await?;
    Ok(epoch)
}
