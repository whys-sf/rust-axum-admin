use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    AssignDeptsReq, AssignMenusReq, CreateRoleReq, CurrentUser, RoleQuery, StatusReq, UpdateRoleReq,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/roles",
    tag = "role",
    params(RoleQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "角色分页列表", body = PageResult<entity::role::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<RoleQuery>,
) -> AppResult<ApiResponse<PageResult<entity::role::Model>>> {
    let page = state.services.list_roles(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/roles/{id}",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "角色详情", body = entity::role::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.get_role(&current, id).await?;
    Ok(ApiResponse::ok(role))
}

#[utoipa::path(
    post,
    path = "/api/v1/roles",
    tag = "role",
    request_body = CreateRoleReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建角色", body = entity::role::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateRoleReq>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.create_role(&current, req).await?;
    Ok(ApiResponse::ok(role))
}

#[utoipa::path(
    put,
    path = "/api/v1/roles/{id}",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    request_body = UpdateRoleReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新角色", body = entity::role::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateRoleReq>,
) -> AppResult<ApiResponse<entity::role::Model>> {
    let role = state.services.update_role(&current, id, req).await?;
    Ok(ApiResponse::ok(role))
}

#[utoipa::path(
    delete,
    path = "/api/v1/roles/{id}",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除角色"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_role(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    get,
    path = "/api/v1/roles/{id}/menus",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "角色已分配菜单 ID 列表", body = Vec<i64>))
)]
pub async fn menu_ids(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<i64>>> {
    let ids = state.services.role_menu_ids(&current, id).await?;
    Ok(ApiResponse::ok(ids))
}

#[utoipa::path(
    put,
    path = "/api/v1/roles/{id}/menus",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    request_body = AssignMenusReq,
    security(("bearer" = [])),
    responses((status = 200, description = "分配角色菜单（同步 Casbin 策略）"))
)]
pub async fn assign_menus(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignMenusReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.assign_role_menus(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    get,
    path = "/api/v1/roles/{id}/depts",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "自定义数据范围的部门 ID 列表", body = Vec<i64>))
)]
pub async fn dept_ids(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<i64>>> {
    let ids = state.services.role_dept_ids(&current, id).await?;
    Ok(ApiResponse::ok(ids))
}

#[utoipa::path(
    put,
    path = "/api/v1/roles/{id}/depts",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    request_body = AssignDeptsReq,
    security(("bearer" = [])),
    responses((status = 200, description = "分配角色自定义数据范围部门"))
)]
pub async fn assign_depts(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignDeptsReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.assign_role_depts(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    put,
    path = "/api/v1/roles/{id}/status",
    tag = "role",
    params(("id" = i64, Path, description = "角色 ID")),
    request_body = StatusReq,
    security(("bearer" = [])),
    responses((status = 200, description = "启用/禁用角色", body = entity::role::Model))
)]
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
