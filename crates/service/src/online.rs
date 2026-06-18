use chrono::Utc;
use common::{redis, AppError, AppResult};
use serde_json::Value;

use crate::dto::{CurrentUser, OnlineUser};
use crate::Services;

impl Services {
    /// List live login sessions. Platform admins see every tenant; tenant
    /// users only see sessions within their own tenant.
    pub async fn list_online(&self, current: &CurrentUser) -> AppResult<Vec<OnlineUser>> {
        let sessions = redis::list_sessions(&self.redis)
            .await
            .map_err(AppError::Other)?;
        let scope = current.acting_tenant().to_string();

        let mut out: Vec<OnlineUser> = Vec::with_capacity(sessions.len());
        for (token, payload) in sessions {
            let Ok(v) = serde_json::from_str::<Value>(&payload) else {
                continue;
            };
            let tenant_id = v.get("tenant_id").and_then(Value::as_str).unwrap_or("");
            if !current.is_platform && tenant_id != scope {
                continue;
            }
            out.push(OnlineUser {
                token,
                user_id: v
                    .get("user_id")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                username: v
                    .get("username")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                tenant_id: tenant_id.to_string(),
                is_platform: v
                    .get("is_platform")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
                ip: v.get("ip").and_then(Value::as_str).map(ToString::to_string),
                login_at: v
                    .get("login_at")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
            });
        }
        // newest sessions first
        out.sort_by(|a, b| b.login_at.cmp(&a.login_at));
        Ok(out)
    }

    /// Force a session offline. Blacklists the access token immediately and
    /// bumps the user's password epoch so any outstanding refresh tokens are
    /// rejected too — the targeted user is fully logged out.
    pub async fn force_logout(&self, current: &CurrentUser, token: &str) -> AppResult<()> {
        let sessions = redis::list_sessions(&self.redis)
            .await
            .map_err(AppError::Other)?;
        let (_, payload) = sessions
            .into_iter()
            .find(|(id, _)| id == token)
            .ok_or_else(|| AppError::not_found("会话不存在或已过期"))?;

        let v: Value = serde_json::from_str(&payload).map_err(|e| AppError::Other(e.into()))?;
        let tenant_id = v.get("tenant_id").and_then(Value::as_str).unwrap_or("");
        if !current.is_platform && tenant_id != current.acting_tenant().to_string() {
            return Err(AppError::Forbidden);
        }
        let user_id: i64 = v
            .get("user_id")
            .and_then(Value::as_str)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| AppError::not_found("会话数据异常"))?;

        redis::blacklist_token(&self.redis, token, self.jwt.access_ttl())
            .await
            .map_err(AppError::Other)?;
        let _ = redis::set_password_epoch(
            &self.redis,
            user_id,
            Utc::now().timestamp(),
            self.jwt.refresh_ttl(),
        )
        .await;
        let _ = redis::remove_session(&self.redis, token).await;
        Ok(())
    }
}
