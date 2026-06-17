use axum::extract::{Path, Query, State};
use axum::Json;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use serde::Deserialize;
use service::dto::{CreateTenantReq, PageQuery, StatusReq, UpdateTenantReq};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct TenantQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub keyword: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<TenantQuery>,
) -> AppResult<ApiResponse<PageResult<entity::tenant::Model>>> {
    let page = PageQuery::new(query.page.unwrap_or(1), query.page_size.unwrap_or(10));
    let result = state.services.list_tenants(page, query.keyword).await?;
    Ok(ApiResponse::ok(result))
}

pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.get_tenant(id).await?;
    Ok(ApiResponse::ok(tenant))
}

pub async fn create(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateTenantReq>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.create_tenant(req).await?;
    Ok(ApiResponse::ok(tenant))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateTenantReq>,
) -> AppResult<ApiResponse<entity::tenant::Model>> {
    let tenant = state.services.update_tenant(id, req).await?;
    Ok(ApiResponse::ok(tenant))
}

pub async fn set_status(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(req): Json<StatusReq>,
) -> AppResult<ApiResponse<()>> {
    state.services.set_tenant_status(id, req.status).await?;
    Ok(ApiResponse::ok_empty())
}

pub async fn remove(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_tenant(id).await?;
    Ok(ApiResponse::ok_empty())
}
