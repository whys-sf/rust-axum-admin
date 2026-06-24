use crate::error::HttpResult;
use crate::response::ApiResponse;
use axum::extract::{Path, State};
use axum::Extension;
use service::dto::{CacheStat, CurrentUser, OnlineUser, ServerStat};

use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/online",
    tag = "monitor",
    security(("bearer" = [])),
    responses((status = 200, description = "在线用户列表", body = [OnlineUser]))
)]
pub async fn online_list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> HttpResult<ApiResponse<Vec<OnlineUser>>> {
    let list = state.services.list_online(&current).await?;
    Ok(ApiResponse::ok(list))
}

#[utoipa::path(
    delete,
    path = "/api/v1/online/{token}",
    tag = "monitor",
    params(("token" = String, Path, description = "会话 token（access jti）")),
    security(("bearer" = [])),
    responses((status = 200, description = "强制下线"))
)]
pub async fn kick(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(token): Path<String>,
) -> HttpResult<ApiResponse<()>> {
    state.services.force_logout(&current, &token).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    get,
    path = "/api/v1/monitor/server",
    tag = "monitor",
    security(("bearer" = [])),
    responses((status = 200, description = "服务器资源监控", body = ServerStat))
)]
pub async fn server(State(state): State<AppState>) -> HttpResult<ApiResponse<ServerStat>> {
    let stat = state.services.server_stat().await?;
    Ok(ApiResponse::ok(stat))
}

#[utoipa::path(
    get,
    path = "/api/v1/monitor/cache",
    tag = "monitor",
    security(("bearer" = [])),
    responses((status = 200, description = "Redis 缓存监控", body = CacheStat))
)]
pub async fn cache(State(state): State<AppState>) -> HttpResult<ApiResponse<CacheStat>> {
    let stat = state.services.cache_stat().await?;
    Ok(ApiResponse::ok(stat))
}
