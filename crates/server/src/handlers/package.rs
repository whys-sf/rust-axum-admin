use axum::extract::{Path, State};
use service::dto::{CreatePackageReq, PackageResp, UpdatePackageReq};

use crate::error::HttpResult;
use crate::extract::ValidatedJson;
use crate::response::ApiResponse;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/platform/features",
    tag = "package",
    security(("bearer" = [])),
    responses((status = 200, description = "功能开关列表（仅平台超管）", body = Vec<entity::feature::Model>))
)]
pub async fn features(
    State(state): State<AppState>,
) -> HttpResult<ApiResponse<Vec<entity::feature::Model>>> {
    let result = state.services.list_features().await?;
    Ok(ApiResponse::ok(result))
}

#[utoipa::path(
    get,
    path = "/api/v1/platform/packages",
    tag = "package",
    security(("bearer" = [])),
    responses((status = 200, description = "套餐列表（仅平台超管）", body = Vec<PackageResp>))
)]
pub async fn list(State(state): State<AppState>) -> HttpResult<ApiResponse<Vec<PackageResp>>> {
    let result = state.services.list_packages().await?;
    Ok(ApiResponse::ok(result))
}

#[utoipa::path(
    post,
    path = "/api/v1/platform/packages",
    tag = "package",
    request_body = CreatePackageReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建套餐", body = PackageResp))
)]
pub async fn create(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreatePackageReq>,
) -> HttpResult<ApiResponse<PackageResp>> {
    let result = state.services.create_package(req).await?;
    Ok(ApiResponse::ok(result))
}

#[utoipa::path(
    put,
    path = "/api/v1/platform/packages/{id}",
    tag = "package",
    params(("id" = i64, Path, description = "套餐 ID")),
    request_body = UpdatePackageReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新套餐", body = PackageResp))
)]
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdatePackageReq>,
) -> HttpResult<ApiResponse<PackageResp>> {
    let result = state.services.update_package(id, req).await?;
    Ok(ApiResponse::ok(result))
}

#[utoipa::path(
    delete,
    path = "/api/v1/platform/packages/{id}",
    tag = "package",
    params(("id" = i64, Path, description = "套餐 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除套餐"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_package(id).await?;
    Ok(ApiResponse::ok_empty())
}
