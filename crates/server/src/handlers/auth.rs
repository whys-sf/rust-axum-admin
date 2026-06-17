use axum::extract::State;
use axum::http::HeaderMap;
use axum::{Extension, Json};
use common::jwt::Claims;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CurrentUser, LoginReq, LoginResp, MenuNode, RefreshReq, UserInfoResp};

use crate::extract::ValidatedJson;
use crate::state::AppState;

fn client_ip(headers: &HeaderMap) -> Option<String> {
    for h in ["x-forwarded-for", "x-real-ip"] {
        if let Some(v) = headers.get(h).and_then(|v| v.to_str().ok()) {
            if let Some(first) = v.split(',').next() {
                return Some(first.trim().to_string());
            }
        }
    }
    None
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    ValidatedJson(req): ValidatedJson<LoginReq>,
) -> AppResult<ApiResponse<LoginResp>> {
    let ip = client_ip(&headers);
    let resp = state.services.login(req, ip).await?;
    Ok(ApiResponse::ok(resp))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(req): Json<RefreshReq>,
) -> AppResult<ApiResponse<LoginResp>> {
    let resp = state.services.refresh(&req.refresh_token).await?;
    Ok(ApiResponse::ok(resp))
}

pub async fn logout(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> AppResult<ApiResponse<()>> {
    state.services.logout(&claims).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn userinfo(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<UserInfoResp>> {
    let info = state.services.userinfo(&current).await?;
    Ok(ApiResponse::ok(info))
}

pub async fn user_menus(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<MenuNode>>> {
    let menus = state.services.user_menu_tree(&current).await?;
    Ok(ApiResponse::ok(menus))
}
