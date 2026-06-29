use crate::error::HttpResult;
use crate::response::ApiResponse;
use axum::body::Body;
use axum::extract::{Multipart, Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Extension;
use common::response::PageResult;
use common::AppError;
use serde::Deserialize;
use service::dto::{
    CreateFileFolderReq, CurrentUser, FileContent, FileFolderView, FileQuery, FileView,
    MoveFileReq, UpdateFileFolderReq,
};

use crate::state::AppState;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UploadQuery {
    /// Mark the file public (reachable without auth) — used for logos / login
    /// backgrounds.
    #[serde(default)]
    pub is_public: bool,
    /// Optional target folder id. Omit for root / unfiled uploads.
    pub folder_id: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/v1/files",
    tag = "file",
    params(UploadQuery),
    request_body(content = String, description = "multipart/form-data，字段名 file", content_type = "multipart/form-data"),
    security(("bearer" = [])),
    responses((status = 200, description = "上传文件", body = FileView))
)]
pub async fn upload(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<UploadQuery>,
    mut multipart: Multipart,
) -> HttpResult<ApiResponse<FileView>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::bad_request(format!("上传解析失败: {e}")))?
    {
        if field.name() != Some("file") {
            continue;
        }
        let original_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "file".to_string());
        let content_type = field
            .content_type()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());
        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::bad_request(format!("读取上传内容失败: {e}")))?
            .to_vec();
        let folder_id = query
            .folder_id
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .map(|s| {
                s.parse::<i64>()
                    .map_err(|_| AppError::bad_request("文件夹ID格式错误"))
            })
            .transpose()?;
        let view = state
            .services
            .upload_file(
                &current,
                original_name,
                content_type,
                data,
                query.is_public,
                folder_id,
            )
            .await?;
        return Ok(ApiResponse::ok(view));
    }
    Err(AppError::bad_request("缺少 file 字段").into())
}

#[utoipa::path(
    get,
    path = "/api/v1/files",
    tag = "file",
    params(FileQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "文件分页列表", body = PageResult<FileView>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<FileQuery>,
) -> HttpResult<ApiResponse<PageResult<FileView>>> {
    let page = state.services.list_files(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/file-folders",
    tag = "file",
    security(("bearer" = [])),
    responses((status = 200, description = "文件夹列表", body = Vec<FileFolderView>))
)]
pub async fn list_folders(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> HttpResult<ApiResponse<Vec<FileFolderView>>> {
    let folders = state.services.list_file_folders(&current).await?;
    Ok(ApiResponse::ok(folders))
}

#[utoipa::path(
    post,
    path = "/api/v1/file-folders",
    tag = "file",
    request_body = CreateFileFolderReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建文件夹", body = FileFolderView))
)]
pub async fn create_folder(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    axum::Json(req): axum::Json<CreateFileFolderReq>,
) -> HttpResult<ApiResponse<FileFolderView>> {
    let folder = state.services.create_file_folder(&current, req).await?;
    Ok(ApiResponse::ok(folder))
}

#[utoipa::path(
    put,
    path = "/api/v1/file-folders/{id}",
    tag = "file",
    params(("id" = i64, Path, description = "文件夹 ID")),
    request_body = UpdateFileFolderReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新文件夹", body = FileFolderView))
)]
pub async fn update_folder(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<UpdateFileFolderReq>,
) -> HttpResult<ApiResponse<FileFolderView>> {
    let folder = state.services.update_file_folder(&current, id, req).await?;
    Ok(ApiResponse::ok(folder))
}

#[utoipa::path(
    delete,
    path = "/api/v1/file-folders/{id}",
    tag = "file",
    params(("id" = i64, Path, description = "文件夹 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除空文件夹"))
)]
pub async fn delete_folder(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_file_folder(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    put,
    path = "/api/v1/files/{id}/move",
    tag = "file",
    params(("id" = i64, Path, description = "文件 ID")),
    request_body = MoveFileReq,
    security(("bearer" = [])),
    responses((status = 200, description = "移动文件", body = FileView))
)]
pub async fn move_file(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    axum::Json(req): axum::Json<MoveFileReq>,
) -> HttpResult<ApiResponse<FileView>> {
    let file = state.services.move_file(&current, id, req).await?;
    Ok(ApiResponse::ok(file))
}

#[utoipa::path(
    delete,
    path = "/api/v1/files/{id}",
    tag = "file",
    params(("id" = i64, Path, description = "文件 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除文件"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<ApiResponse<()>> {
    state.services.delete_file(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

fn file_response(content: FileContent, inline: bool) -> Response {
    let disposition = if inline { "inline" } else { "attachment" };
    let safe_name = content.original_name.replace('"', "");
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content.content_type),
            (
                header::CONTENT_DISPOSITION,
                format!("{disposition}; filename=\"{safe_name}\""),
            ),
        ],
        Body::from(content.bytes),
    )
        .into_response()
}

#[utoipa::path(
    get,
    path = "/api/v1/files/{id}/download",
    tag = "file",
    params(("id" = i64, Path, description = "文件 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "下载文件（鉴权）"))
)]
pub async fn download(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> HttpResult<Response> {
    let content = state.services.download_file(&current, id).await?;
    Ok(file_response(content, false))
}

#[utoipa::path(
    get,
    path = "/api/v1/public/files/{id}",
    tag = "file",
    params(("id" = i64, Path, description = "文件 ID")),
    responses((status = 200, description = "公开文件（免鉴权，仅 is_public）"))
)]
pub async fn public_download(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> HttpResult<Response> {
    let content = state.services.public_file(id).await?;
    Ok(file_response(content, true))
}
