use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{
    CreateDictItemReq, CreateDictTypeReq, CurrentUser, DictItemNode, DictTypeQuery,
    UpdateDictItemReq, UpdateDictTypeReq,
};
use crate::Services;

/// Root sentinel used as `parent_id` for top-level dictionary items.
const ROOT_ITEM_ID: i64 = 0;

/// Assemble a flat item slice into a tree rooted at `parent_id`.
fn build_item_tree(all: &[entity::dict_item::Model], parent_id: i64) -> Vec<DictItemNode> {
    let mut nodes: Vec<DictItemNode> = all
        .iter()
        .filter(|i| i.parent_id == parent_id)
        .map(|i| DictItemNode {
            item: i.clone(),
            children: build_item_tree(all, i.id),
        })
        .collect();
    nodes.sort_by_key(|n| n.item.sort);
    nodes
}

impl Services {
    // ------------------------------ dict type ------------------------------

    pub async fn list_dict_types(
        &self,
        current: &CurrentUser,
        query: DictTypeQuery,
    ) -> AppResult<PageResult<entity::dict_type::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select = DictType::find()
            .filter(entity::dict_type::Column::TenantId.eq(current.acting_tenant()));
        if let Some(code) = query.code.filter(|s| !s.is_empty()) {
            select = select.filter(entity::dict_type::Column::Code.contains(&code));
        }
        if let Some(name) = query.name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::dict_type::Column::Name.contains(&name));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::dict_type::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_asc(entity::dict_type::Column::Code)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_dict_type_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::dict_type::Model> {
        DictType::find_by_id(id)
            .filter(entity::dict_type::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("字典类型不存在"))
    }

    pub async fn get_dict_type(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::dict_type::Model> {
        self.find_dict_type_scoped(current, id).await
    }

    pub async fn create_dict_type(
        &self,
        current: &CurrentUser,
        req: CreateDictTypeReq,
    ) -> AppResult<entity::dict_type::Model> {
        let tenant_id = current.acting_tenant();
        let exists = DictType::find()
            .filter(entity::dict_type::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_type::Column::Code.eq(&req.code))
            .one(&self.db)
            .await?
            .is_some();
        if exists {
            return Err(AppError::conflict("字典编码已存在"));
        }
        let now = Utc::now();
        let model = entity::dict_type::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            code: Set(req.code),
            name: Set(req.name),
            is_tree: Set(req.is_tree),
            status: Set(req.status.unwrap_or(1)),
            remark: Set(req.remark),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_dict_type(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateDictTypeReq,
    ) -> AppResult<entity::dict_type::Model> {
        let model = self.find_dict_type_scoped(current, id).await?;
        let mut active: entity::dict_type::ActiveModel = model.into();
        if let Some(name) = req.name {
            active.name = Set(name);
        }
        if let Some(is_tree) = req.is_tree {
            active.is_tree = Set(is_tree);
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

    /// Delete a dictionary type and all of its items (within the tenant).
    pub async fn delete_dict_type(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let tenant_id = current.acting_tenant();
        let model = self.find_dict_type_scoped(current, id).await?;
        DictItem::delete_many()
            .filter(entity::dict_item::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_item::Column::DictCode.eq(&model.code))
            .exec(&self.db)
            .await?;
        DictType::delete_by_id(id)
            .filter(entity::dict_type::Column::TenantId.eq(tenant_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    // ------------------------------ dict item ------------------------------

    async fn items_by_code(
        &self,
        tenant_id: i64,
        code: &str,
    ) -> AppResult<Vec<entity::dict_item::Model>> {
        Ok(DictItem::find()
            .filter(entity::dict_item::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_item::Column::DictCode.eq(code))
            .order_by_asc(entity::dict_item::Column::Sort)
            .all(&self.db)
            .await?)
    }

    /// List items for a dictionary type. Tree dictionaries are nested; flat
    /// dictionaries return every item as a root with empty children.
    pub async fn list_dict_items(
        &self,
        current: &CurrentUser,
        type_id: i64,
    ) -> AppResult<Vec<DictItemNode>> {
        let ty = self.find_dict_type_scoped(current, type_id).await?;
        self.items_for_code(current.acting_tenant(), &ty.code, ty.is_tree)
            .await
    }

    /// Resolve items by dictionary code (consumer-facing). The tree flag is read
    /// from the dictionary type; unknown codes yield an empty list.
    pub async fn list_dict_items_by_code(
        &self,
        current: &CurrentUser,
        code: &str,
    ) -> AppResult<Vec<DictItemNode>> {
        let tenant_id = current.acting_tenant();
        let is_tree = DictType::find()
            .filter(entity::dict_type::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_type::Column::Code.eq(code))
            .one(&self.db)
            .await?
            .map(|t| t.is_tree)
            .unwrap_or(false);
        self.items_for_code(tenant_id, code, is_tree).await
    }

    async fn items_for_code(
        &self,
        tenant_id: i64,
        code: &str,
        is_tree: bool,
    ) -> AppResult<Vec<DictItemNode>> {
        let items = self.items_by_code(tenant_id, code).await?;
        if is_tree {
            Ok(build_item_tree(&items, ROOT_ITEM_ID))
        } else {
            Ok(items
                .into_iter()
                .map(|item| DictItemNode {
                    item,
                    children: Vec::new(),
                })
                .collect())
        }
    }

    async fn find_dict_item_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::dict_item::Model> {
        DictItem::find_by_id(id)
            .filter(entity::dict_item::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("字典项不存在"))
    }

    pub async fn create_dict_item(
        &self,
        current: &CurrentUser,
        req: CreateDictItemReq,
    ) -> AppResult<entity::dict_item::Model> {
        let tenant_id = current.acting_tenant();
        // the dictionary type must exist within the tenant.
        DictType::find()
            .filter(entity::dict_type::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_type::Column::Code.eq(&req.dict_code))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::bad_request("字典类型不存在"))?;
        if req.parent_id != ROOT_ITEM_ID {
            let parent = self.find_dict_item_scoped(current, req.parent_id).await?;
            if parent.dict_code != req.dict_code {
                return Err(AppError::bad_request("上级字典项与字典编码不一致"));
            }
        }
        let now = Utc::now();
        let model = entity::dict_item::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            dict_code: Set(req.dict_code),
            parent_id: Set(req.parent_id),
            label: Set(req.label),
            value: Set(req.value),
            sort: Set(req.sort.unwrap_or(0)),
            status: Set(req.status.unwrap_or(1)),
            css_class: Set(req.css_class),
            list_class: Set(req.list_class),
            remark: Set(req.remark),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_dict_item(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateDictItemReq,
    ) -> AppResult<entity::dict_item::Model> {
        let item = self.find_dict_item_scoped(current, id).await?;
        if let Some(parent_id) = req.parent_id {
            if parent_id == id {
                return Err(AppError::bad_request("上级字典项不能是自身"));
            }
            if parent_id != ROOT_ITEM_ID {
                let parent = self.find_dict_item_scoped(current, parent_id).await?;
                if parent.dict_code != item.dict_code {
                    return Err(AppError::bad_request("上级字典项与字典编码不一致"));
                }
            }
        }
        let mut active: entity::dict_item::ActiveModel = item.into();
        if let Some(parent_id) = req.parent_id {
            active.parent_id = Set(parent_id);
        }
        if let Some(label) = req.label {
            active.label = Set(label);
        }
        if let Some(value) = req.value {
            active.value = Set(value);
        }
        if let Some(sort) = req.sort {
            active.sort = Set(sort);
        }
        if let Some(status) = req.status {
            active.status = Set(status);
        }
        if let Some(css_class) = req.css_class {
            active.css_class = Set(Some(css_class));
        }
        if let Some(list_class) = req.list_class {
            active.list_class = Set(Some(list_class));
        }
        if let Some(remark) = req.remark {
            active.remark = Set(Some(remark));
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    /// Delete a dictionary item. Items with children cannot be removed.
    pub async fn delete_dict_item(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let tenant_id = current.acting_tenant();
        self.find_dict_item_scoped(current, id).await?;
        let has_children = DictItem::find()
            .filter(entity::dict_item::Column::TenantId.eq(tenant_id))
            .filter(entity::dict_item::Column::ParentId.eq(id))
            .one(&self.db)
            .await?
            .is_some();
        if has_children {
            return Err(AppError::bad_request("请先删除下级字典项"));
        }
        DictItem::delete_by_id(id)
            .filter(entity::dict_item::Column::TenantId.eq(tenant_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
