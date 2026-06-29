use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{CreateNoticeReq, CurrentUser, NoticeQuery, UpdateNoticeReq};
use crate::Services;

const NOTICE_TYPE_DEFAULT: i16 = 1;

impl Services {
    pub async fn list_notices(
        &self,
        current: &CurrentUser,
        query: NoticeQuery,
    ) -> AppResult<PageResult<entity::notice::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Notice::find().filter(entity::notice::Column::TenantId.eq(current.acting_tenant()));
        if let Some(title) = query.title.filter(|s| !s.is_empty()) {
            select = select.filter(entity::notice::Column::Title.contains(&title));
        }
        if let Some(notice_type) = query.notice_type {
            select = select.filter(entity::notice::Column::NoticeType.eq(notice_type));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::notice::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_desc(entity::notice::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_notice_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::notice::Model> {
        Notice::find_by_id(id)
            .filter(entity::notice::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("公告不存在"))
    }

    pub async fn get_notice(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::notice::Model> {
        self.find_notice_scoped(current, id).await
    }

    pub async fn create_notice(
        &self,
        current: &CurrentUser,
        req: CreateNoticeReq,
    ) -> AppResult<entity::notice::Model> {
        let now = Utc::now();
        let model = entity::notice::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(current.acting_tenant()),
            title: Set(req.title),
            notice_type: Set(req.notice_type.unwrap_or(NOTICE_TYPE_DEFAULT)),
            content: Set(req.content.unwrap_or_default()),
            status: Set(req.status.unwrap_or(1)),
            created_by: Set(Some(current.id)),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_notice(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateNoticeReq,
    ) -> AppResult<entity::notice::Model> {
        let model = self.find_notice_scoped(current, id).await?;
        let mut active: entity::notice::ActiveModel = model.into();
        if let Some(title) = req.title {
            active.title = Set(title);
        }
        if let Some(notice_type) = req.notice_type {
            active.notice_type = Set(notice_type);
        }
        if let Some(content) = req.content {
            active.content = Set(content);
        }
        if let Some(status) = req.status {
            active.status = Set(status);
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_notice(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        self.find_notice_scoped(current, id).await?;
        Notice::delete_by_id(id)
            .filter(entity::notice::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
