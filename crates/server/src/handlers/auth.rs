use axum::extract::State;
use axum::http::HeaderMap;
use axum::{Extension, Json};
use common::jwt::Claims;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CurrentUser, LoginReq, LoginResp, MenuNode, RefreshReq, UserInfoResp};

use crate::extract::ValidatedJson;
use crate::state::AppState;

fn client_ip(headers: &HeaderMap, trust_forwarded: bool) -> Option<String> {
    // Only trust client-supplied forwarding headers behind a known proxy.
    if !trust_forwarded {
        return None;
    }
    for h in ["x-forwarded-for", "x-real-ip"] {
        if let Some(v) = headers.get(h).and_then(|v| v.to_str().ok()) {
            if let Some(first) = v.split(',').next() {
                return Some(first.trim().to_string());
            }
        }
    }
    None
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "auth",
    request_body = LoginReq,
    responses((status = 200, description = "登录成功，返回访问/刷新令牌", body = LoginResp))
)]
pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    ValidatedJson(req): ValidatedJson<LoginReq>,
) -> AppResult<ApiResponse<LoginResp>> {
    let ip = client_ip(&headers, state.services.settings.server.trust_forwarded_for);
    let resp = state.services.login(req, ip).await?;
    Ok(ApiResponse::ok(resp))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    tag = "auth",
    request_body = RefreshReq,
    responses((status = 200, description = "刷新成功", body = LoginResp))
)]
pub async fn refresh(
    State(state): State<AppState>,
    Json(req): Json<RefreshReq>,
) -> AppResult<ApiResponse<LoginResp>> {
    let resp = state.services.refresh(&req.refresh_token).await?;
    Ok(ApiResponse::ok(resp))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    tag = "auth",
    security(("bearer" = [])),
    responses((status = 200, description = "退出登录"))
)]
pub async fn logout(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> AppResult<ApiResponse<()>> {
    state.services.logout(&claims).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/userinfo",
    tag = "auth",
    security(("bearer" = [])),
    responses((status = 200, description = "当前登录用户信息", body = UserInfoResp))
)]
pub async fn userinfo(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<UserInfoResp>> {
    let info = state.services.userinfo(&current).await?;
    Ok(ApiResponse::ok(info))
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/menus",
    tag = "auth",
    security(("bearer" = [])),
    responses((status = 200, description = "当前用户的菜单树", body = Vec<MenuNode>))
)]
pub async fn user_menus(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<MenuNode>>> {
    let menus = state.services.user_menu_tree(&current).await?;
    Ok(ApiResponse::ok(menus))
}
