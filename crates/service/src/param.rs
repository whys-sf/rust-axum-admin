use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{CreateParamReq, CurrentUser, ParamQuery, UpdateParamReq};
use crate::Services;

/// `param_type` for built-in parameters that must not be deleted.
const PARAM_TYPE_BUILTIN: i16 = 1;
const PARAM_TYPE_CUSTOM: i16 = 2;

impl Services {
    pub async fn list_params(
        &self,
        current: &CurrentUser,
        query: ParamQuery,
    ) -> AppResult<PageResult<entity::param::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Param::find().filter(entity::param::Column::TenantId.eq(current.acting_tenant()));
        if let Some(name) = query.name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::param::Column::Name.contains(&name));
        }
        if let Some(key) = query.param_key.filter(|s| !s.is_empty()) {
            select = select.filter(entity::param::Column::ParamKey.contains(&key));
        }
        let paginator = select
            .order_by_asc(entity::param::Column::ParamKey)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_param_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::param::Model> {
        Param::find_by_id(id)
            .filter(entity::param::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("参数不存在"))
    }

    pub async fn get_param(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::param::Model> {
        self.find_param_scoped(current, id).await
    }

    pub async fn create_param(
        &self,
        current: &CurrentUser,
        req: CreateParamReq,
    ) -> AppResult<entity::param::Model> {
        let tenant_id = current.acting_tenant();
        let exists = Param::find()
            .filter(entity::param::Column::TenantId.eq(tenant_id))
            .filter(entity::param::Column::ParamKey.eq(&req.param_key))
            .one(&self.db)
            .await?
            .is_some();
        if exists {
            return Err(AppError::conflict("参数键名已存在"));
        }
        let now = Utc::now();
        let model = entity::param::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            name: Set(req.name),
            param_key: Set(req.param_key),
            param_value: Set(req.param_value),
            param_type: Set(PARAM_TYPE_CUSTOM),
            remark: Set(req.remark),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_param(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateParamReq,
    ) -> AppResult<entity::param::Model> {
        let model = self.find_param_scoped(current, id).await?;
        let mut active: entity::param::ActiveModel = model.into();
        if let Some(name) = req.name {
            active.name = Set(name);
        }
        if let Some(value) = req.param_value {
            active.param_value = Set(value);
        }
        if let Some(remark) = req.remark {
            active.remark = Set(Some(remark));
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    /// Delete a parameter. Built-in parameters are protected.
    pub async fn delete_param(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let model = self.find_param_scoped(current, id).await?;
        if model.param_type == PARAM_TYPE_BUILTIN {
            return Err(AppError::bad_request("内置参数不可删除"));
        }
        Param::delete_by_id(id)
            .filter(entity::param::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
