use axum::extract::{Path, State};
use axum::Extension;
use common::response::ApiResponse;
use common::AppResult;
use service::dto::{CreateDeptReq, CurrentUser, DeptNode, UpdateDeptReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/depts",
    tag = "dept",
    security(("bearer" = [])),
    responses((status = 200, description = "部门树", body = Vec<DeptNode>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<DeptNode>>> {
    let tree = state.services.list_depts(&current).await?;
    Ok(ApiResponse::ok(tree))
}

#[utoipa::path(
    get,
    path = "/api/v1/depts/{id}",
    tag = "dept",
    params(("id" = i64, Path, description = "部门 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "部门详情", body = entity::dept::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.get_dept(&current, id).await?;
    Ok(ApiResponse::ok(dept))
}

#[utoipa::path(
    post,
    path = "/api/v1/depts",
    tag = "dept",
    request_body = CreateDeptReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建部门", body = entity::dept::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateDeptReq>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.create_dept(&current, req).await?;
    Ok(ApiResponse::ok(dept))
}

#[utoipa::path(
    put,
    path = "/api/v1/depts/{id}",
    tag = "dept",
    params(("id" = i64, Path, description = "部门 ID")),
    request_body = UpdateDeptReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新部门", body = entity::dept::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateDeptReq>,
) -> AppResult<ApiResponse<entity::dept::Model>> {
    let dept = state.services.update_dept(&current, id, req).await?;
    Ok(ApiResponse::ok(dept))
}

#[utoipa::path(
    delete,
    path = "/api/v1/depts/{id}",
    tag = "dept",
    params(("id" = i64, Path, description = "部门 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除部门"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_dept(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
