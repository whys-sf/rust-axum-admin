use crate::error::HttpResult;
use crate::response::ApiResponse;
use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::PageResult;
use service::dto::{CreateNoticeReq, CurrentUser, NoticeQuery, UpdateNoticeReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/notices",
    tag = "notice",
    params(NoticeQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "公告分页列表", body = PageResult<entity::notice::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<NoticeQuery>,
) -> HttpResult<ApiResponse<PageResult<entity::notice::Model>>> {
    let page = state.services.list_notices(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/notices/{id}",
    tag = "notice",
    params(("id" = i64, Path, description = "公告 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "公告详情", body = entity::notice::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<entity::notice::Model>> {
    let notice = state.services.get_notice(&current, id).await?;
    Ok(ApiResponse::ok(notice))
}

#[utoipa::path(
    post,
    path = "/api/v1/notices",
    tag = "notice",
    request_body = CreateNoticeReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建公告", body = entity::notice::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateNoticeReq>,
) -> HttpResult<ApiResponse<entity::notice::Model>> {
    let notice = state.services.create_notice(&current, req).await?;
    Ok(ApiResponse::ok(notice))
}

#[utoipa::path(
    put,
    path = "/api/v1/notices/{id}",
    tag = "notice",
    params(("id" = i64, Path, description = "公告 ID")),
    request_body = UpdateNoticeReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新公告", body = entity::notice::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateNoticeReq>,
) -> HttpResult<ApiResponse<entity::notice::Model>> {
    let notice = state.services.update_notice(&current, id, req).await?;
    Ok(ApiResponse::ok(notice))
}

#[utoipa::path(
    delete,
    path = "/api/v1/notices/{id}",
    tag = "notice",
    params(("id" = i64, Path, description = "公告 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除公告"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_notice(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
