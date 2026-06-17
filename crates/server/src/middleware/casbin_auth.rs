use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use common::AppError;
use service::dto::CurrentUser;
use service::permission;

use crate::state::AppState;

/// Enforce RBAC-with-domains. Platform admins are short-circuited. Tenant users
/// are checked against every role they hold within their tenant domain.
pub async fn guard(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let current = req
        .extensions()
        .get::<CurrentUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    if current.is_platform {
        return Ok(next.run(req).await);
    }

    // `nest` strips the mount prefix from `req.uri()`, so use the original URI
    // to enforce against the same paths stored in the casbin policies.
    let path = req
        .extensions()
        .get::<axum::extract::OriginalUri>()
        .map(|o| o.0.path().to_string())
        .unwrap_or_else(|| req.uri().path().to_string());
    let method = req.method().as_str().to_string();

    let allowed = permission::enforce(
        &state.services.enforcer,
        current.id,
        current.tenant_id,
        &path,
        &method,
    )
    .await?;

    if !allowed {
        return Err(AppError::Forbidden);
    }

    Ok(next.run(req).await)
}
