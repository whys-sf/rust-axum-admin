use crate::error::HttpResult;
use crate::response::ApiResponse;
use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::PageResult;
use service::dto::{
    AssignRolesReq, ChangePasswordReq, CreateUserReq, CurrentUser, ResetPasswordReq, StatusReq,
    UpdateUserReq, UserDetail, UserQuery,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/users",
    tag = "user",
    params(UserQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "用户分页列表（应用数据权限）", body = PageResult<entity::user::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<UserQuery>,
) -> HttpResult<ApiResponse<PageResult<entity::user::Model>>> {
    let page = state.services.list_users(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "用户详情（含角色 ID）", body = UserDetail))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<UserDetail>> {
    let user = state.services.get_user(&current, id).await?;
    Ok(ApiResponse::ok(user))
}

#[utoipa::path(
    post,
    path = "/api/v1/users",
    tag = "user",
    request_body = CreateUserReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建用户", body = entity::user::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateUserReq>,
) -> HttpResult<ApiResponse<entity::user::Model>> {
    let user = state.services.create_user(&current, req).await?;
    Ok(ApiResponse::ok(user))
}

#[utoipa::path(
    put,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    request_body = UpdateUserReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新用户", body = entity::user::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateUserReq>,
) -> HttpResult<ApiResponse<entity::user::Model>> {
    let user = state.services.update_user(&current, id, req).await?;
    Ok(ApiResponse::ok(user))
}

#[utoipa::path(
    delete,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除用户"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_user(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    put,
    path = "/api/v1/users/{id}/status",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    request_body = StatusReq,
    security(("bearer" = [])),
    responses((status = 200, description = "启用/禁用用户"))
)]
pub async fn set_status(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<StatusReq>,
) -> HttpResult<ApiResponse<()>> {
    state
        .services
        .set_user_status(&current, id, req.status)
        .await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    put,
    path = "/api/v1/users/{id}/password",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    request_body = ResetPasswordReq,
    security(("bearer" = [])),
    responses((status = 200, description = "重置用户密码"))
)]
pub async fn reset_password(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<ResetPasswordReq>,
) -> HttpResult<ApiResponse<()>> {
    state.services.reset_password(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    put,
    path = "/api/v1/users/{id}/roles",
    tag = "user",
    params(("id" = i64, Path, description = "用户 ID")),
    request_body = AssignRolesReq,
    security(("bearer" = [])),
    responses((status = 200, description = "分配用户角色"))
)]
pub async fn assign_roles(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignRolesReq>,
) -> HttpResult<ApiResponse<()>> {
    state.services.assign_user_roles(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    put,
    path = "/api/v1/profile/password",
    tag = "user",
    request_body = ChangePasswordReq,
    security(("bearer" = [])),
    responses((status = 200, description = "修改本人密码"))
)]
pub async fn change_own_password(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<ChangePasswordReq>,
) -> HttpResult<ApiResponse<()>> {
    state.services.change_own_password(&current, req).await?;
    Ok(ApiResponse::ok_empty())
}
