use common::response::PageResult;
use common::AppResult;
use entity::prelude::*;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder};

use crate::dto::{CurrentUser, PageQuery};
use crate::Services;

impl Services {
    /// List operation logs. Tenant users only see their own tenant's logs;
    /// platform admins see everything.
    pub async fn list_logs(
        &self,
        current: &CurrentUser,
        page: PageQuery,
        username: Option<String>,
    ) -> AppResult<PageResult<entity::operation_log::Model>> {
        let (page_no, page_size) = page.normalized();
        let mut select = OperationLog::find();
        if !current.is_platform {
            select =
                select.filter(entity::operation_log::Column::TenantId.eq(current.acting_tenant()));
        }
        if let Some(username) = username.filter(|s| !s.is_empty()) {
            select = select.filter(entity::operation_log::Column::Username.contains(&username));
        }
        let paginator = select
            .order_by_desc(entity::operation_log::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page_no - 1).await?;
        Ok(PageResult::new(list, total, page_no, page_size))
    }
}
