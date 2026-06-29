use crate::error::HttpResult;
use crate::response::ApiResponse;
use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::PageResult;
use service::dto::{CreateParamReq, CurrentUser, ParamQuery, UpdateParamReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/params",
    tag = "param",
    params(ParamQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "参数分页列表", body = PageResult<entity::param::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<ParamQuery>,
) -> HttpResult<ApiResponse<PageResult<entity::param::Model>>> {
    let page = state.services.list_params(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/params/{id}",
    tag = "param",
    params(("id" = i64, Path, description = "参数 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "参数详情", body = entity::param::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<entity::param::Model>> {
    let param = state.services.get_param(&current, id).await?;
    Ok(ApiResponse::ok(param))
}

#[utoipa::path(
    post,
    path = "/api/v1/params",
    tag = "param",
    request_body = CreateParamReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建参数", body = entity::param::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateParamReq>,
) -> HttpResult<ApiResponse<entity::param::Model>> {
    let param = state.services.create_param(&current, req).await?;
    Ok(ApiResponse::ok(param))
}

#[utoipa::path(
    put,
    path = "/api/v1/params/{id}",
    tag = "param",
    params(("id" = i64, Path, description = "参数 ID")),
    request_body = UpdateParamReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新参数", body = entity::param::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateParamReq>,
) -> HttpResult<ApiResponse<entity::param::Model>> {
    let param = state.services.update_param(&current, id, req).await?;
    Ok(ApiResponse::ok(param))
}

#[utoipa::path(
    delete,
    path = "/api/v1/params/{id}",
    tag = "param",
    params(("id" = i64, Path, description = "参数 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除参数（内置参数受保护）"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_param(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
