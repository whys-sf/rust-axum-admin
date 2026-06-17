use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

use crate::dto::{
    AssignDeptsReq, AssignMenusReq, CreateRoleReq, CurrentUser, RoleQuery, UpdateRoleReq,
};
use crate::{permission, Services, PLATFORM_TENANT_ID};

impl Services {
    pub async fn list_roles(
        &self,
        current: &CurrentUser,
        query: RoleQuery,
    ) -> AppResult<PageResult<entity::role::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Role::find().filter(entity::role::Column::TenantId.eq(current.acting_tenant()));
        if let Some(name) = query.name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::role::Column::Name.contains(&name));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::role::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_asc(entity::role::Column::Sort)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_role_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::role::Model> {
        Role::find_by_id(id)
            .filter(entity::role::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("角色不存在"))
    }

    pub async fn get_role(&self, current: &CurrentUser, id: i64) -> AppResult<entity::role::Model> {
        self.find_role_scoped(current, id).await
    }

    pub async fn role_menu_ids(&self, current: &CurrentUser, id: i64) -> AppResult<Vec<i64>> {
        self.find_role_scoped(current, id).await?;
        let ids = RoleMenu::find()
            .filter(entity::role_menu::Column::RoleId.eq(id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|rm| rm.menu_id)
            .collect();
        Ok(ids)
    }

    pub async fn create_role(
        &self,
        current: &CurrentUser,
        req: CreateRoleReq,
    ) -> AppResult<entity::role::Model> {
        let tenant_id = current.acting_tenant();
        let exists = Role::find()
            .filter(entity::role::Column::TenantId.eq(tenant_id))
            .filter(entity::role::Column::Code.eq(&req.code))
            .one(&self.db)
            .await?
            .is_some();
        if exists {
            return Err(AppError::conflict("角色标识已存在"));
        }

        let now = Utc::now();
        let role = entity::role::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            name: Set(req.name),
            code: Set(req.code),
            sort: Set(req.sort.unwrap_or(0)),
            status: Set(req.status.unwrap_or(1)),
            data_scope: Set(req.data_scope.unwrap_or(1)),
            remark: Set(req.remark),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&self.db)
        .await?;

        if !req.menu_ids.is_empty() {
            self.assign_role_menus_inner(current, &role, req.menu_ids)
                .await?;
        }
        Ok(role)
    }

    pub async fn update_role(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateRoleReq,
    ) -> AppResult<entity::role::Model> {
        let role = self.find_role_scoped(current, id).await?;
        let mut active: entity::role::ActiveModel = role.into();
        if let Some(v) = req.name {
            active.name = Set(v);
        }
        if let Some(v) = req.sort {
            active.sort = Set(v);
        }
        if let Some(v) = req.status {
            active.status = Set(v);
        }
        if let Some(v) = req.data_scope {
            active.data_scope = Set(v);
        }
        if req.remark.is_some() {
            active.remark = Set(req.remark);
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_role(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let role = self.find_role_scoped(current, id).await?;
        if role.code == "admin" {
            return Err(AppError::bad_request("内置管理员角色不可删除"));
        }
        let in_use = UserRole::find()
            .filter(entity::user_role::Column::RoleId.eq(id))
            .one(&self.db)
            .await?
            .is_some();
        if in_use {
            return Err(AppError::bad_request("该角色已分配给用户，无法删除"));
        }

        let txn = self.db.begin().await?;
        RoleMenu::delete_many()
            .filter(entity::role_menu::Column::RoleId.eq(id))
            .exec(&txn)
            .await?;
        RoleDept::delete_many()
            .filter(entity::role_dept::Column::RoleId.eq(id))
            .exec(&txn)
            .await?;
        Role::delete_by_id(id).exec(&txn).await?;
        txn.commit().await?;

        permission::remove_role_policies(&self.enforcer, role.tenant_id, &role.code).await?;
        Ok(())
    }

    pub async fn role_dept_ids(&self, current: &CurrentUser, id: i64) -> AppResult<Vec<i64>> {
        self.find_role_scoped(current, id).await?;
        let ids = RoleDept::find()
            .filter(entity::role_dept::Column::RoleId.eq(id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|rd| rd.dept_id)
            .collect();
        Ok(ids)
    }

    /// Set the custom departments backing a role's `data_scope = custom`.
    pub async fn assign_role_depts(
        &self,
        current: &CurrentUser,
        id: i64,
        req: AssignDeptsReq,
    ) -> AppResult<()> {
        let role = self.find_role_scoped(current, id).await?;

        if !req.dept_ids.is_empty() {
            let valid = Dept::find()
                .filter(entity::dept::Column::Id.is_in(req.dept_ids.clone()))
                .filter(entity::dept::Column::TenantId.eq(role.tenant_id))
                .count(&self.db)
                .await?;
            if valid as usize != req.dept_ids.len() {
                return Err(AppError::bad_request("包含无效的部门 id"));
            }
        }

        let txn = self.db.begin().await?;
        RoleDept::delete_many()
            .filter(entity::role_dept::Column::RoleId.eq(id))
            .exec(&txn)
            .await?;
        if !req.dept_ids.is_empty() {
            let rows: Vec<entity::role_dept::ActiveModel> = req
                .dept_ids
                .iter()
                .map(|did| entity::role_dept::ActiveModel {
                    tenant_id: Set(role.tenant_id),
                    role_id: Set(id),
                    dept_id: Set(*did),
                })
                .collect();
            RoleDept::insert_many(rows).exec(&txn).await?;
        }
        txn.commit().await?;
        Ok(())
    }

    pub async fn assign_role_menus(
        &self,
        current: &CurrentUser,
        id: i64,
        req: AssignMenusReq,
    ) -> AppResult<()> {
        let role = self.find_role_scoped(current, id).await?;
        self.assign_role_menus_inner(current, &role, req.menu_ids)
            .await
    }

    async fn assign_role_menus_inner(
        &self,
        current: &CurrentUser,
        role: &entity::role::Model,
        menu_ids: Vec<i64>,
    ) -> AppResult<()> {
        let tenant_id = current.acting_tenant();

        // validate every menu is in the accessible pool (platform or own tenant)
        let valid_menus = Menu::find()
            .filter(entity::menu::Column::Id.is_in(menu_ids.clone()))
            .filter(
                entity::menu::Column::TenantId
                    .eq(PLATFORM_TENANT_ID)
                    .or(entity::menu::Column::TenantId.eq(tenant_id)),
            )
            .all(&self.db)
            .await?;
        if valid_menus.len() != menu_ids.len() {
            return Err(AppError::bad_request("包含无效的菜单 id"));
        }

        let txn = self.db.begin().await?;
        RoleMenu::delete_many()
            .filter(entity::role_menu::Column::RoleId.eq(role.id))
            .exec(&txn)
            .await?;
        if !menu_ids.is_empty() {
            let rows: Vec<entity::role_menu::ActiveModel> = menu_ids
                .iter()
                .map(|mid| entity::role_menu::ActiveModel {
                    tenant_id: Set(role.tenant_id),
                    role_id: Set(role.id),
                    menu_id: Set(*mid),
                })
                .collect();
            RoleMenu::insert_many(rows).exec(&txn).await?;
        }
        txn.commit().await?;

        // rebuild casbin `p` for this role from the selected menus' APIs
        let apis: Vec<(String, String)> = valid_menus
            .into_iter()
            .filter_map(|m| match (m.api_path, m.api_method) {
                (Some(p), Some(method)) if !p.is_empty() && !method.is_empty() => Some((p, method)),
                _ => None,
            })
            .collect();
        permission::sync_role_policies(&self.enforcer, role.tenant_id, &role.code, apis).await?;
        Ok(())
    }
}
