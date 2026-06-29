use serde::{Deserialize, Serialize};

use super::{de_u64, default_page, default_page_size, PageQuery};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct FileQuery {
    #[serde(default = "default_page", deserialize_with = "de_u64")]
    pub page: u64,
    #[serde(default = "default_page_size", deserialize_with = "de_u64")]
    pub page_size: u64,
    pub original_name: Option<String>,
    pub folder_id: Option<String>,
}

impl FileQuery {
    pub fn pagination(&self) -> PageQuery {
        PageQuery::new(self.page, self.page_size)
    }
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateFileFolderReq {
    pub name: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateFileFolderReq {
    pub name: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct MoveFileReq {
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct FileFolderView {
    #[serde(flatten)]
    pub folder: entity::file_folder::Model,
    pub file_count: u64,
}

/// A stored file plus its resolved access URL.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct FileView {
    #[serde(flatten)]
    pub file: entity::file::Model,
    /// Relative URL to fetch the file (public proxy for public files, otherwise
    /// the authenticated download endpoint).
    pub url: String,
}

impl FileView {
    pub fn new(file: entity::file::Model) -> Self {
        let url = if file.is_public {
            format!("/api/v1/public/files/{}", file.id)
        } else {
            format!("/api/v1/files/{}/download", file.id)
        };
        Self { file, url }
    }
}

/// The raw bytes + metadata of a file fetched for download.
#[derive(Debug, Clone)]
pub struct FileContent {
    pub original_name: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
}
