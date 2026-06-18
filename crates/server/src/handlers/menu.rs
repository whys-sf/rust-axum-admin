use axum::extract::{Path, State};
use axum::Extension;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CreateMenuReq, CurrentUser, MenuNode, UpdateMenuReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/menus",
    tag = "menu",
    security(("bearer" = [])),
    responses((status = 200, description = "菜单树", body = Vec<MenuNode>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<MenuNode>>> {
    let tree = state.services.list_menus(&current).await?;
    Ok(ApiResponse::ok(tree))
}

#[utoipa::path(
    get,
    path = "/api/v1/menus/{id}",
    tag = "menu",
    params(("id" = i64, Path, description = "菜单 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "菜单详情", body = entity::menu::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.get_menu(&current, id).await?;
    Ok(ApiResponse::ok(menu))
}

#[utoipa::path(
    post,
    path = "/api/v1/menus",
    tag = "menu",
    request_body = CreateMenuReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建菜单", body = entity::menu::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateMenuReq>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.create_menu(&current, req).await?;
    Ok(ApiResponse::ok(menu))
}

#[utoipa::path(
    put,
    path = "/api/v1/menus/{id}",
    tag = "menu",
    params(("id" = i64, Path, description = "菜单 ID")),
    request_body = UpdateMenuReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新菜单", body = entity::menu::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateMenuReq>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.update_menu(&current, id, req).await?;
    Ok(ApiResponse::ok(menu))
}

#[utoipa::path(
    delete,
    path = "/api/v1/menus/{id}",
    tag = "menu",
    params(("id" = i64, Path, description = "菜单 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除菜单"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_menu(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
