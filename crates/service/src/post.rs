use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{CreatePostReq, CurrentUser, PostQuery, UpdatePostReq};
use crate::Services;

impl Services {
    pub async fn list_posts(
        &self,
        current: &CurrentUser,
        query: PostQuery,
    ) -> AppResult<PageResult<entity::post::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Post::find().filter(entity::post::Column::TenantId.eq(current.acting_tenant()));
        if let Some(code) = query.code.filter(|s| !s.is_empty()) {
            select = select.filter(entity::post::Column::Code.contains(&code));
        }
        if let Some(name) = query.name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::post::Column::Name.contains(&name));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::post::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_asc(entity::post::Column::Sort)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_post_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::post::Model> {
        Post::find_by_id(id)
            .filter(entity::post::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("岗位不存在"))
    }

    pub async fn get_post(&self, current: &CurrentUser, id: i64) -> AppResult<entity::post::Model> {
        self.find_post_scoped(current, id).await
    }

    pub async fn create_post(
        &self,
        current: &CurrentUser,
        req: CreatePostReq,
    ) -> AppResult<entity::post::Model> {
        let tenant_id = current.acting_tenant();
        let exists = Post::find()
            .filter(entity::post::Column::TenantId.eq(tenant_id))
            .filter(entity::post::Column::Code.eq(&req.code))
            .one(&self.db)
            .await?
            .is_some();
        if exists {
            return Err(AppError::conflict("岗位编码已存在"));
        }
        let now = Utc::now();
        let model = entity::post::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            code: Set(req.code),
            name: Set(req.name),
            sort: Set(req.sort.unwrap_or(0)),
            status: Set(req.status.unwrap_or(1)),
            remark: Set(req.remark),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_post(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdatePostReq,
    ) -> AppResult<entity::post::Model> {
        let model = self.find_post_scoped(current, id).await?;
        let mut active: entity::post::ActiveModel = model.into();
        if let Some(name) = req.name {
            active.name = Set(name);
        }
        if let Some(sort) = req.sort {
            active.sort = Set(sort);
        }
        if let Some(status) = req.status {
            active.status = Set(status);
        }
        if let Some(remark) = req.remark {
            active.remark = Set(Some(remark));
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_post(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        self.find_post_scoped(current, id).await?;
        Post::delete_by_id(id)
            .filter(entity::post::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
