use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use common::jwt::{Claims, TOKEN_TYPE_ACCESS};
use common::{redis, AppError};
use service::dto::CurrentUser;

use crate::state::AppState;

const BEARER_PREFIX: &str = "Bearer ";

fn extract_token(req: &Request) -> Option<String> {
    let header = req.headers().get(axum::http::header::AUTHORIZATION)?;
    let value = header.to_str().ok()?;
    value
        .strip_prefix(BEARER_PREFIX)
        .map(|s| s.trim().to_string())
}

/// Verify the access token, reject blacklisted/expired tokens, and attach
/// `CurrentUser` + `Claims` to the request extensions.
pub async fn guard(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = extract_token(&req).ok_or(AppError::Unauthorized)?;

    let claims: Claims = state
        .services
        .jwt
        .verify(&token)
        .map_err(|_| AppError::Unauthorized)?;

    if claims.typ != TOKEN_TYPE_ACCESS {
        return Err(AppError::Unauthorized);
    }

    if redis::is_blacklisted(&state.services.redis, &claims.jti)
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Unauthorized);
    }

    let user_id: i64 = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    // tokens issued before the user's last password change are invalid
    if let Ok(Some(epoch)) = redis::password_epoch(&state.services.redis, user_id).await {
        if (claims.iat as i64) < epoch {
            return Err(AppError::Unauthorized);
        }
    }
    let roles = state
        .services
        .user_role_codes(claims.tenant_id, user_id)
        .await
        .unwrap_or_default();

    let current = CurrentUser {
        id: user_id,
        username: claims.username.clone(),
        tenant_id: claims.tenant_id,
        is_platform: claims.is_platform,
        roles,
    };

    req.extensions_mut().insert(current);
    req.extensions_mut().insert(claims);

    Ok(next.run(req).await)
}

/// Guard restricting a route to platform administrators only.
pub async fn platform_only(req: Request, next: Next) -> Result<Response, AppError> {
    let current = req
        .extensions()
        .get::<CurrentUser>()
        .ok_or(AppError::Unauthorized)?;
    if !current.is_platform {
        return Err(AppError::Forbidden);
    }
    Ok(next.run(req).await)
}
