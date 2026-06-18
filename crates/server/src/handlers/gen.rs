use std::io::Write;

use axum::body::Body;
use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    CurrentUser, DbTableInfo, GenFile, GenTableDetail, GenTableQuery, ImportTablesReq,
    UpdateGenTableReq,
};
use zip::write::SimpleFileOptions;

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/gen/db-tables",
    tag = "gen",
    security(("bearer" = [])),
    responses((status = 200, description = "数据库物理表列表", body = Vec<DbTableInfo>))
)]
pub async fn db_tables(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<Vec<DbTableInfo>>> {
    let data = state.services.list_db_tables(&current).await?;
    Ok(ApiResponse::ok(data))
}

#[utoipa::path(
    get,
    path = "/api/v1/gen/tables",
    tag = "gen",
    params(GenTableQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "已导入的生成配置分页列表", body = PageResult<entity::gen_table::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<GenTableQuery>,
) -> AppResult<ApiResponse<PageResult<entity::gen_table::Model>>> {
    let page = state.services.list_gen_tables(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    post,
    path = "/api/v1/gen/import",
    tag = "gen",
    request_body = ImportTablesReq,
    security(("bearer" = [])),
    responses((status = 200, description = "导入物理表"))
)]
pub async fn import(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<ImportTablesReq>,
) -> AppResult<ApiResponse<u64>> {
    let count = state.services.import_tables(&current, req).await?;
    Ok(ApiResponse::ok(count))
}

#[utoipa::path(
    get,
    path = "/api/v1/gen/tables/{id}",
    tag = "gen",
    params(("id" = i64, Path, description = "配置 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "生成配置详情（含列）", body = GenTableDetail))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<GenTableDetail>> {
    let detail = state.services.get_gen_table(&current, id).await?;
    Ok(ApiResponse::ok(detail))
}

#[utoipa::path(
    put,
    path = "/api/v1/gen/tables/{id}",
    tag = "gen",
    params(("id" = i64, Path, description = "配置 ID")),
    request_body = UpdateGenTableReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新生成配置", body = GenTableDetail))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateGenTableReq>,
) -> AppResult<ApiResponse<GenTableDetail>> {
    let detail = state.services.update_gen_table(&current, id, req).await?;
    Ok(ApiResponse::ok(detail))
}

#[utoipa::path(
    delete,
    path = "/api/v1/gen/tables/{id}",
    tag = "gen",
    params(("id" = i64, Path, description = "配置 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除生成配置"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_gen_table(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    get,
    path = "/api/v1/gen/tables/{id}/preview",
    tag = "gen",
    params(("id" = i64, Path, description = "配置 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "预览生成的代码文件", body = Vec<GenFile>))
)]
pub async fn preview(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<Vec<GenFile>>> {
    let files = state.services.generate_code(&current, id).await?;
    Ok(ApiResponse::ok(files))
}

#[utoipa::path(
    get,
    path = "/api/v1/gen/tables/{id}/download",
    tag = "gen",
    params(("id" = i64, Path, description = "配置 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "下载生成代码 zip 包"))
)]
pub async fn download(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<Response> {
    let detail = state.services.get_gen_table(&current, id).await?;
    let files = state.services.generate_code(&current, id).await?;

    let mut buf = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        for file in &files {
            zip.start_file(&file.path, options)
                .map_err(|e| common::AppError::Other(anyhow::Error::new(e)))?;
            zip.write_all(file.content.as_bytes())
                .map_err(|e| common::AppError::Other(anyhow::Error::new(e)))?;
        }
        zip.finish()
            .map_err(|e| common::AppError::Other(anyhow::Error::new(e)))?;
    }

    let filename = format!("{}.zip", detail.table.module_name);
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/zip".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        Body::from(buf),
    )
        .into_response())
}
