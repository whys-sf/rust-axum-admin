use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{CreatePostReq, CurrentUser, PostQuery, UpdatePostReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/posts",
    tag = "post",
    params(PostQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "岗位分页列表", body = PageResult<entity::post::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<PostQuery>,
) -> AppResult<ApiResponse<PageResult<entity::post::Model>>> {
    let page = state.services.list_posts(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(("id" = i64, Path, description = "岗位 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "岗位详情", body = entity::post::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::post::Model>> {
    let post = state.services.get_post(&current, id).await?;
    Ok(ApiResponse::ok(post))
}

#[utoipa::path(
    post,
    path = "/api/v1/posts",
    tag = "post",
    request_body = CreatePostReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建岗位", body = entity::post::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreatePostReq>,
) -> AppResult<ApiResponse<entity::post::Model>> {
    let post = state.services.create_post(&current, req).await?;
    Ok(ApiResponse::ok(post))
}

#[utoipa::path(
    put,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(("id" = i64, Path, description = "岗位 ID")),
    request_body = UpdatePostReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新岗位", body = entity::post::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdatePostReq>,
) -> AppResult<ApiResponse<entity::post::Model>> {
    let post = state.services.update_post(&current, id, req).await?;
    Ok(ApiResponse::ok(post))
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(("id" = i64, Path, description = "岗位 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除岗位"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_post(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
