use axum::extract::{Path, State};
use axum::Extension;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CreateDeptReq, CurrentUser, DeptNode, UpdateDeptReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<DeptNode>>> {
    let tree = state.services.list_depts(&current).await?;
    Ok(ApiResponse::ok(tree))
}

pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.get_dept(&current, id).await?;
    Ok(ApiResponse::ok(dept))
}

pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateDeptReq>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.create_dept(&current, req).await?;
    Ok(ApiResponse::ok(dept))
}

pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateDeptReq>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.update_dept(&current, id, req).await?;
    Ok(ApiResponse::ok(dept))
}

pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_dept(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
