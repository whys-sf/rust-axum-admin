use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    AssignRolesReq, ChangePasswordReq, CreateUserReq, CurrentUser, ResetPasswordReq, StatusReq,
    UpdateUserReq, UserDetail, UserQuery,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<UserQuery>,
) -> AppResult<ApiResponse<PageResult<entity::user::Model>>> {
    let page = state.services.list_users(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<UserDetail>> {
    let user = state.services.get_user(&current, id).await?;
    Ok(ApiResponse::ok(user))
}

pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateUserReq>,
) -> AppResult<ApiResponse<entity::user::Model>> {
    let user = state.services.create_user(&current, req).await?;
    Ok(ApiResponse::ok(user))
}

pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateUserReq>,
) -> AppResult<ApiResponse<entity::user::Model>> {
    let user = state.services.update_user(&current, id, req).await?;
    Ok(ApiResponse::ok(user))
}

pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_user(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn set_status(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<StatusReq>,
) -> AppResult<ApiResponse<()>> {
    state
        .services
        .set_user_status(&current, id, req.status)
        .await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn reset_password(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<ResetPasswordReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.reset_password(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn assign_roles(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<AssignRolesReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.assign_user_roles(&current, id, req).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn change_own_password(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<ChangePasswordReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.change_own_password(&current, req).await?;
    Ok(ApiResponse::ok_empty())
}
