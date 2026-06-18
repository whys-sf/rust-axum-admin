use chrono::Utc;
use common::jwt::{Claims, TOKEN_TYPE_REFRESH};
use common::{redis, AppError, AppResult};
use entity::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};

use crate::dto::{CurrentUser, LoginReq, LoginResp, MenuNode, UserInfoResp};
use crate::{menu, Services, PLATFORM_TENANT_ID};

const MAX_LOGIN_FAILS: i64 = 5;
const LOGIN_LOCK_WINDOW_SECS: i64 = 900;
/// Max login attempts (success or failure) per source IP within the window.
const MAX_LOGIN_PER_IP: i64 = 30;

impl Services {
    /// Resolve a tenant by login code, validating status and expiry.
    async fn resolve_active_tenant(&self, code: &str) -> AppResult<entity::tenant::Model> {
        let tenant = Tenant::find()
            .filter(entity::tenant::Column::Code.eq(code))
            .one(&self.db)
            .await?
            .ok_or(AppError::Unauthorized)?;

        self.assert_tenant_active(&tenant)?;
        Ok(tenant)
    }

    /// Validate a tenant is enabled and not expired (the platform tenant is
    /// always considered active).
    fn assert_tenant_active(&self, tenant: &entity::tenant::Model) -> AppResult<()> {
        if tenant.id == PLATFORM_TENANT_ID {
            return Ok(());
        }
        if tenant.status != 1 {
            return Err(AppError::bad_request("租户已被禁用"));
        }
        if let Some(expire) = tenant.expire_at {
            if expire < Utc::now() {
                return Err(AppError::bad_request("租户已过期"));
            }
        }
        Ok(())
    }

    pub async fn login(&self, req: LoginReq, ip: Option<String>) -> AppResult<LoginResp> {
        // throttle by source IP to slow credential stuffing across usernames
        if let Some(ip) = ip.as_deref().filter(|s| !s.is_empty()) {
            let attempts = redis::incr_login_attempt_ip(&self.redis, ip, LOGIN_LOCK_WINDOW_SECS)
                .await
                .unwrap_or(0);
            if attempts > MAX_LOGIN_PER_IP {
                return Err(AppError::bad_request("登录尝试过于频繁，请稍后再试"));
            }
        }

        let tenant = self.resolve_active_tenant(&req.tenant_code).await?;

        let user = User::find()
            .filter(entity::user::Column::TenantId.eq(tenant.id))
            .filter(entity::user::Column::Username.eq(&req.username))
            .filter(entity::user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await?;

        let user = match user {
            Some(u) => u,
            None => return Err(AppError::Unauthorized),
        };

        if user.status != 1 {
            return Err(AppError::bad_request("账号已被禁用"));
        }

        if !common::password::verify(&req.password, &user.password) {
            let count = redis::incr_login_fail(
                &self.redis,
                tenant.id,
                &req.username,
                LOGIN_LOCK_WINDOW_SECS,
            )
            .await
            .unwrap_or(0);
            if count >= MAX_LOGIN_FAILS {
                return Err(AppError::bad_request(
                    "密码错误次数过多，账号已锁定 15 分钟",
                ));
            }
            return Err(AppError::Unauthorized);
        }

        let _ = redis::reset_login_fail(&self.redis, tenant.id, &req.username).await;

        let is_platform = tenant.id == PLATFORM_TENANT_ID;

        let pair = self
            .jwt
            .issue_pair(user.id, &user.username, tenant.id, is_platform)
            .map_err(AppError::Other)?;

        // record the online session (keyed by the access-token jti)
        self.register_session(
            &pair.access_jti,
            user.id,
            &user.username,
            tenant.id,
            is_platform,
            ip.as_deref(),
        )
        .await;

        // update last-login info (best effort)
        let mut active: entity::user::ActiveModel = user.clone().into();
        active.last_login_at = Set(Some(Utc::now()));
        active.last_login_ip = Set(ip);
        let _ = active.update(&self.db).await;

        Ok(LoginResp {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            expires_in: pair.expires_in,
            token_type: "Bearer".to_string(),
        })
    }

    pub async fn refresh(&self, refresh_token: &str) -> AppResult<LoginResp> {
        let claims = self
            .jwt
            .verify(refresh_token)
            .map_err(|_| AppError::Unauthorized)?;
        if claims.typ != TOKEN_TYPE_REFRESH {
            return Err(AppError::Unauthorized);
        }
        if redis::is_blacklisted(&self.redis, &claims.jti)
            .await
            .unwrap_or(false)
        {
            return Err(AppError::Unauthorized);
        }

        let user_id: i64 = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

        // reject tokens issued before the user's last password change
        if let Ok(Some(epoch)) = redis::password_epoch(&self.redis, user_id).await {
            if (claims.iat as i64) < epoch {
                return Err(AppError::Unauthorized);
            }
        }

        // re-validate the account and tenant are still active; a token alone
        // must not let a disabled user/tenant keep minting fresh credentials.
        let user = User::find_by_id(user_id)
            .filter(entity::user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await?
            .ok_or(AppError::Unauthorized)?;
        if user.status != 1 {
            return Err(AppError::Unauthorized);
        }
        let tenant = Tenant::find_by_id(claims.tenant_id)
            .one(&self.db)
            .await?
            .ok_or(AppError::Unauthorized)?;
        self.assert_tenant_active(&tenant)
            .map_err(|_| AppError::Unauthorized)?;

        let pair = self
            .jwt
            .issue_pair(
                user_id,
                &claims.username,
                claims.tenant_id,
                claims.is_platform,
            )
            .map_err(AppError::Other)?;

        // refresh keeps the session alive under the new access-token jti
        self.register_session(
            &pair.access_jti,
            user_id,
            &claims.username,
            claims.tenant_id,
            claims.is_platform,
            None,
        )
        .await;

        // rotate: blacklist the used refresh token for its remaining lifetime
        let remaining = claims.exp as i64 - Utc::now().timestamp();
        let _ = redis::blacklist_token(&self.redis, &claims.jti, remaining).await;

        Ok(LoginResp {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            expires_in: pair.expires_in,
            token_type: "Bearer".to_string(),
        })
    }

    /// Blacklist the access token until it would naturally expire.
    pub async fn logout(&self, claims: &Claims) -> AppResult<()> {
        let remaining = claims.exp as i64 - Utc::now().timestamp();
        redis::blacklist_token(&self.redis, &claims.jti, remaining)
            .await
            .map_err(AppError::Other)?;
        let _ = redis::remove_session(&self.redis, &claims.jti).await;
        Ok(())
    }

    /// Persist an online-session record keyed by the access-token jti. Best
    /// effort: redis hiccups must not fail the login/refresh path.
    async fn register_session(
        &self,
        session_id: &str,
        user_id: i64,
        username: &str,
        tenant_id: i64,
        is_platform: bool,
        ip: Option<&str>,
    ) {
        let payload = serde_json::json!({
            "user_id": user_id.to_string(),
            "username": username,
            "tenant_id": tenant_id.to_string(),
            "is_platform": is_platform,
            "ip": ip,
            "login_at": Utc::now().to_rfc3339(),
        })
        .to_string();
        let _ =
            redis::register_session(&self.redis, session_id, &payload, self.jwt.access_ttl()).await;
    }

    /// Look up the role codes bound to a user in a tenant.
    pub async fn user_role_codes(&self, tenant_id: i64, user_id: i64) -> AppResult<Vec<String>> {
        let role_ids: Vec<i64> = UserRole::find()
            .filter(entity::user_role::Column::UserId.eq(user_id))
            .filter(entity::user_role::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|ur| ur.role_id)
            .collect();

        if role_ids.is_empty() {
            return Ok(vec![]);
        }

        let codes = Role::find()
            .filter(entity::role::Column::Id.is_in(role_ids))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|r| r.code)
            .collect();
        Ok(codes)
    }

    pub async fn userinfo(&self, current: &CurrentUser) -> AppResult<UserInfoResp> {
        let user = User::find_by_id(current.id)
            .one(&self.db)
            .await?
            .ok_or(AppError::Unauthorized)?;
        let tenant = Tenant::find_by_id(current.tenant_id)
            .one(&self.db)
            .await?
            .ok_or(AppError::Unauthorized)?;

        let permissions = self.user_permissions(current).await?;

        Ok(UserInfoResp {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            is_platform: current.is_platform,
            roles: current.roles.clone(),
            permissions,
        })
    }

    /// Collect the button-permission identifiers visible to the caller.
    async fn user_permissions(&self, current: &CurrentUser) -> AppResult<Vec<String>> {
        let menus = self.accessible_menus(current).await?;
        let perms = menus
            .into_iter()
            .filter_map(|m| m.perm)
            .filter(|p| !p.is_empty())
            .collect();
        Ok(perms)
    }

    /// Menus the caller can see: platform admins get every menu in the
    /// `(0, tenant)` pool; tenant users get only menus granted to their roles.
    pub async fn accessible_menus(
        &self,
        current: &CurrentUser,
    ) -> AppResult<Vec<entity::menu::Model>> {
        let tenant_id = current.acting_tenant();
        let pool = Menu::find()
            .filter(
                entity::menu::Column::TenantId
                    .eq(PLATFORM_TENANT_ID)
                    .or(entity::menu::Column::TenantId.eq(tenant_id)),
            )
            .order_by_asc(entity::menu::Column::Sort)
            .all(&self.db)
            .await?;

        if current.is_platform {
            return Ok(pool);
        }

        // gather menu ids granted to the user's roles
        let role_ids: Vec<i64> = UserRole::find()
            .filter(entity::user_role::Column::UserId.eq(current.id))
            .filter(entity::user_role::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|ur| ur.role_id)
            .collect();

        if role_ids.is_empty() {
            return Ok(vec![]);
        }

        let granted: std::collections::HashSet<i64> = RoleMenu::find()
            .filter(entity::role_menu::Column::RoleId.is_in(role_ids))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|rm| rm.menu_id)
            .collect();

        Ok(pool
            .into_iter()
            .filter(|m| granted.contains(&m.id))
            .collect())
    }

    /// Build the menu tree for the front-end dynamic router (directories + menus).
    pub async fn user_menu_tree(&self, current: &CurrentUser) -> AppResult<Vec<MenuNode>> {
        let mut menus = self.accessible_menus(current).await?;
        // only directories(1) and menus(2) appear in the route tree
        menus.retain(|m| m.r#type == 1 || m.r#type == 2);
        // platform-only entries must never surface for tenant users, even if a
        // tenant role happens to be granted them.
        if !current.is_platform {
            menus.retain(|m| !is_platform_menu(m));
        }
        Ok(menu::build_tree(menus, 0))
    }
}

/// Platform-only menus live under the `/platform` route space (perm prefix
/// `platform:`); tenant users must never see them in their menu tree.
fn is_platform_menu(menu: &entity::menu::Model) -> bool {
    menu.path
        .as_deref()
        .is_some_and(|p| p.starts_with("/platform"))
        || menu
            .perm
            .as_deref()
            .is_some_and(|p| p.starts_with("platform:"))
}
