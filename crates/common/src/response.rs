use serde::Serialize;

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
