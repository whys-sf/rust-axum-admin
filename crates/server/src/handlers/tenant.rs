use axum::extract::{Path, Query, State};
use axum::Json;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use serde::Deserialize;
use service::dto::{CreateTenantReq, PageQuery, StatusReq, UpdateTenantReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct TenantQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub keyword: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/v1/platform/tenants",
    tag = "tenant",
    params(TenantQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "租户分页列表（仅平台超管）", body = PageResult<entity::tenant::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<TenantQuery>,
) -> AppResult<ApiResponse<PageResult<entity::tenant::Model>>> {
    let page = PageQuery::new(query.page.unwrap_or(1), query.page_size.unwrap_or(10));
    let result = state.services.list_tenants(page, query.keyword).await?;
    Ok(ApiResponse::ok(result))
}

#[utoipa::path(
    get,
    path = "/api/v1/platform/tenants/{id}",
    tag = "tenant",
    params(("id" = i64, Path, description = "租户 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "租户详情", body = entity::tenant::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.get_tenant(id).await?;
    Ok(ApiResponse::ok(tenant))
}

#[utoipa::path(
    post,
    path = "/api/v1/platform/tenants",
    tag = "tenant",
    request_body = CreateTenantReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建租户（事务化初始化 admin 角色与首个管理员）", body = entity::tenant::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateTenantReq>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.create_tenant(req).await?;
    Ok(ApiResponse::ok(tenant))
}

#[utoipa::path(
    put,
    path = "/api/v1/platform/tenants/{id}",
    tag = "tenant",
    params(("id" = i64, Path, description = "租户 ID")),
    request_body = UpdateTenantReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新租户", body = entity::tenant::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateTenantReq>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.update_tenant(id, req).await?;
    Ok(ApiResponse::ok(tenant))
}

#[utoipa::path(
    put,
    path = "/api/v1/platform/tenants/{id}/status",
    tag = "tenant",
    params(("id" = i64, Path, description = "租户 ID")),
    request_body = StatusReq,
    security(("bearer" = [])),
    responses((status = 200, description = "启用/禁用租户"))
)]
pub async fn set_status(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(req): Json<StatusReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.set_tenant_status(id, req.status).await?;
    Ok(ApiResponse::ok_empty())
}

#[utoipa::path(
    delete,
    path = "/api/v1/platform/tenants/{id}",
    tag = "tenant",
    params(("id" = i64, Path, description = "租户 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除租户"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_tenant(id).await?;
    Ok(ApiResponse::ok_empty())
}
