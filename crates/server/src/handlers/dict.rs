use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    CreateDictItemReq, CreateDictTypeReq, CurrentUser, DictItemNode, DictTypeQuery,
    UpdateDictItemReq, UpdateDictTypeReq,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

// ------------------------------ dict type ------------------------------

#[utoipa::path(
    get,
    path = "/api/v1/dicts/types",
    tag = "dict",
    params(DictTypeQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "字典类型分页列表", body = PageResult<entity::dict_type::Model>))
)]
pub async fn list_types(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<DictTypeQuery>,
) -> AppResult<ApiResponse<PageResult<entity::dict_type::Model>>> {
    let page = state.services.list_dict_types(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/dicts/types/{id}",
    tag = "dict",
    params(("id" = i64, Path, description = "字典类型 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "字典类型详情", body = entity::dict_type::Model))
)]
pub async fn type_detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::dict_type::Model>> {
    let ty = state.services.get_dict_type(&current, id).await?;
    Ok(ApiResponse::ok(ty))
}

#[utoipa::path(
    post,
    path = "/api/v1/dicts/types",
    tag = "dict",
    request_body = CreateDictTypeReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建字典类型", body = entity::dict_type::Model))
)]
pub async fn create_type(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateDictTypeReq>,
) -> AppResult<ApiResponse<entity::dict_type::Model>> {
    let ty = state.services.create_dict_type(&current, req).await?;
    Ok(ApiResponse::ok(ty))
}

#[utoipa::path(
    put,
    path = "/api/v1/dicts/types/{id}",
    tag = "dict",
    params(("id" = i64, Path, description = "字典类型 ID")),
    request_body = UpdateDictTypeReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新字典类型", body = entity::dict_type::Model))
)]
pub async fn update_type(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateDictTypeReq>,
) -> AppResult<ApiResponse<entity::dict_type::Model>> {
    let ty = state.services.update_dict_type(&current, id, req).await?;
    Ok(ApiResponse::ok(ty))
}

#[utoipa::path(
    delete,
    path = "/api/v1/dicts/types/{id}",
    tag = "dict",
    params(("id" = i64, Path, description = "字典类型 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除字典类型（级联删除字典项）"))
)]
pub async fn remove_type(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_dict_type(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}

// ------------------------------ dict item ------------------------------

#[utoipa::path(
    get,
    path = "/api/v1/dicts/types/{id}/items",
    tag = "dict",
    params(("id" = i64, Path, description = "字典类型 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "字典项（树形字典返回树，非树形返回平铺）", body = Vec<DictItemNode>))
)]
pub async fn list_items(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<DictItemNode>>> {
    let items = state.services.list_dict_items(&current, id).await?;
    Ok(ApiResponse::ok(items))
}

#[utoipa::path(
    get,
    path = "/api/v1/dicts/code/{code}/items",
    tag = "dict",
    params(("code" = String, Path, description = "字典编码")),
    security(("bearer" = [])),
    responses((status = 200, description = "按字典编码取字典项（供下拉等消费）", body = Vec<DictItemNode>))
)]
pub async fn list_items_by_code(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(code): Path<String>,
) -> AppResult<ApiResponse<Vec<DictItemNode>>> {
    let items = state
        .services
        .list_dict_items_by_code(&current, &code)
        .await?;
    Ok(ApiResponse::ok(items))
}

#[utoipa::path(
    post,
    path = "/api/v1/dicts/items",
    tag = "dict",
    request_body = CreateDictItemReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建字典项", body = entity::dict_item::Model))
)]
pub async fn create_item(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateDictItemReq>,
) -> AppResult<ApiResponse<entity::dict_item::Model>> {
    let item = state.services.create_dict_item(&current, req).await?;
    Ok(ApiResponse::ok(item))
}

#[utoipa::path(
    put,
    path = "/api/v1/dicts/items/{id}",
    tag = "dict",
    params(("id" = i64, Path, description = "字典项 ID")),
    request_body = UpdateDictItemReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新字典项", body = entity::dict_item::Model))
)]
pub async fn update_item(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateDictItemReq>,
) -> AppResult<ApiResponse<entity::dict_item::Model>> {
    let item = state.services.update_dict_item(&current, id, req).await?;
    Ok(ApiResponse::ok(item))
}

#[utoipa::path(
    delete,
    path = "/api/v1/dicts/items/{id}",
    tag = "dict",
    params(("id" = i64, Path, description = "字典项 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除字典项"))
)]
pub async fn remove_item(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_dict_item(&current, id).await?;
    Ok(ApiResponse::ok_empty())
}
