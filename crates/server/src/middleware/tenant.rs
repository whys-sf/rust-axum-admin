use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use common::AppError;
use service::dto::CurrentUser;
use service::PLATFORM_TENANT_ID;

use crate::state::AppState;

const TENANT_HEADER: &str = "x-tenant-id";

/// Resolve and validate the acting tenant. Platform admins may target another
/// tenant via the `X-Tenant-Id` header; everyone else is pinned to their own
/// tenant. Disabled/expired tenants are rejected.
pub async fn resolve(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let mut current = req
        .extensions()
        .get::<CurrentUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    // platform admin acting on behalf of another tenant
    if current.is_platform {
        if let Some(raw) = req.headers().get(TENANT_HEADER).and_then(|v| v.to_str().ok()) {
            if let Ok(tid) = raw.trim().parse::<i64>() {
                current.tenant_id = tid;
            }
        }
    }

    let acting = current.tenant_id;

    // validate non-platform tenants are enabled and not expired
    if acting != PLATFORM_TENANT_ID {
        let tenant = state.services.get_tenant(acting).await?;
        if tenant.status != 1 {
            return Err(AppError::Forbidden);
        }
        if let Some(expire) = tenant.expire_at {
            if expire < chrono::Utc::now() {
                return Err(AppError::Forbidden);
            }
        }
    }

    // re-insert the (possibly overridden) current user carrying the acting tenant
    req.extensions_mut().insert(current);

    Ok(next.run(req).await)
}
