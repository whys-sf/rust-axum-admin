use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

/// Uniform API envelope: `{ code, message, data }`.
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: Some(data),
        }
    }
}

impl ApiResponse<()> {
    pub fn ok_empty() -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: None,
        }
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Paginated list payload.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct PageResult<T: Serialize + utoipa::ToSchema> {
    pub list: Vec<T>,
    pub total: u64,
    pub page: u64,
    pub page_size: u64,
}

impl<T: Serialize + utoipa::ToSchema> PageResult<T> {
    pub fn new(list: Vec<T>, total: u64, page: u64, page_size: u64) -> Self {
        Self {
            list,
            total,
            page,
            page_size,
        }
    }
}
