use axum::extract::State;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{AppSettings, UpdateSettingsReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/public/settings",
    tag = "config",
    responses((status = 200, description = "公开站点设置（免登录）", body = AppSettings))
)]
pub async fn public_settings(State(state): State<AppState>) -> AppResult<ApiResponse<AppSettings>> {
    let settings = state.services.get_settings().await?;
    Ok(ApiResponse::ok(settings))
}

#[utoipa::path(
    get,
    path = "/api/v1/settings",
    tag = "config",
    security(("bearer" = [])),
    responses((status = 200, description = "站点设置", body = AppSettings))
)]
pub async fn get_settings(State(state): State<AppState>) -> AppResult<ApiResponse<AppSettings>> {
    let settings = state.services.get_settings().await?;
    Ok(ApiResponse::ok(settings))
}

#[utoipa::path(
    put,
    path = "/api/v1/settings",
    tag = "config",
    request_body = UpdateSettingsReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新站点设置", body = AppSettings))
)]
pub async fn update_settings(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<UpdateSettingsReq>,
) -> AppResult<ApiResponse<AppSettings>> {
    let settings = state.services.update_settings(req).await?;
    Ok(ApiResponse::ok(settings))
}
