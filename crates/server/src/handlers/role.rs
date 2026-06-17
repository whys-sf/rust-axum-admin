use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    AssignDeptsReq, AssignMenusReq, CreateRoleReq, CurrentUser, RoleQuery, StatusReq, UpdateRoleReq,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<RoleQuery>,
) -> AppResult<ApiResponse<PageResult<entity::role::Model>>> {
    let page = state.services.list_roles(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.get_role(&current, id).await?;
    Ok(ApiResponse::ok(role))
}

pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateRoleReq>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.create_role(&current, req).await?;
    Ok(ApiResponse::ok(role))
}

pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateRoleReq>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.update_role(&current, id, req).await?;
    Ok(ApiResponse::ok(role))
}

pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_role(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn menu_ids(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<i64>>> {
    let ids = state.services.role_menu_ids(&current, id).await?;
    Ok(ApiResponse::ok(ids))
}

pub async fn assign_menus(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignMenusReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.assign_role_menus(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn dept_ids(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<i64>>> {
    let ids = state.services.role_dept_ids(&current, id).await?;
    Ok(ApiResponse::ok(ids))
}

pub async fn assign_depts(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignDeptsReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.assign_role_depts(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn set_status(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<StatusReq>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state
        .services
        .update_role(
            &current,
            id,
            UpdateRoleReq {
                name: None,
                sort: None,
                status: Some(req.status),
                data_scope: None,
                remark: None,
            },
        )
        .await?;
    Ok(ApiResponse::ok(role))
}
