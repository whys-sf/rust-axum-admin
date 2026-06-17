use axum::extract::{Path, State};
use axum::Extension;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CreateMenuReq, CurrentUser, MenuNode, UpdateMenuReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<MenuNode>>> {
    let tree = state.services.list_menus(&current).await?;
    Ok(ApiResponse::ok(tree))
}

pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.get_menu(&current, id).await?;
    Ok(ApiResponse::ok(menu))
}

pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateMenuReq>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.create_menu(&current, req).await?;
    Ok(ApiResponse::ok(menu))
}

pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateMenuReq>,
) -> AppResult<ApiResponse<entity::menu::Model>> {
    let menu = state.services.update_menu(&current, id, req).await?;
    Ok(ApiResponse::ok(menu))
}

pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_menu(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
