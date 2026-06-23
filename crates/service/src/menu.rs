use chrono::Utc;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};

use crate::dto::{CreateMenuReq, CurrentUser, MenuNode, UpdateMenuReq};
use crate::{Services, PLATFORM_TENANT_ID};

/// Assemble a flat menu list into a tree rooted at `parent_id`.
pub fn build_tree(all: Vec<entity::menu::Model>, parent_id: i64) -> Vec<MenuNode> {
    let mut nodes: Vec<MenuNode> = all
        .iter()
        .filter(|m| m.parent_id == parent_id)
        .map(|m| MenuNode {
            menu: m.clone(),
            children: build_tree(all.clone(), m.id),
        })
        .collect();
    nodes.sort_by_key(|n| n.menu.sort);
    nodes
}

impl Services {
    /// The tenant a menu write should target. Platform admins manage the shared
    /// pool (tenant 0); tenant admins manage their own custom menus.
    fn menu_write_tenant(&self, current: &CurrentUser) -> i64 {
        if current.is_platform {
            PLATFORM_TENANT_ID
        } else {
            current.acting_tenant()
        }
    }

    pub async fn list_menus(&self, current: &CurrentUser) -> AppResult<Vec<MenuNode>> {
        let tenant_id = current.acting_tenant();
        let menus = Menu::find()
            .filter(
                entity::menu::Column::TenantId
                    .eq(PLATFORM_TENANT_ID)
                    .or(entity::menu::Column::TenantId.eq(tenant_id)),
            )
            .order_by_asc(entity::menu::Column::Sort)
            .all(&self.db)
            .await?;
        Ok(build_tree(menus, 0))
    }

    pub async fn get_menu(&self, current: &CurrentUser, id: i64) -> AppResult<entity::menu::Model> {
        let tenant_id = current.acting_tenant();
        Menu::find_by_id(id)
            .filter(
                entity::menu::Column::TenantId
                    .eq(PLATFORM_TENANT_ID)
                    .or(entity::menu::Column::TenantId.eq(tenant_id)),
            )
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("菜单不存在"))
    }

    pub async fn create_menu(
        &self,
        current: &CurrentUser,
        req: CreateMenuReq,
    ) -> AppResult<entity::menu::Model> {
        let now = Utc::now();
        let model = entity::menu::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(self.menu_write_tenant(current)),
            parent_id: Set(req.parent_id),
            name: Set(req.name),
            r#type: Set(req.r#type),
            path: Set(req.path),
            component: Set(req.component),
            perm: Set(req.perm),
            api_path: Set(req.api_path),
            api_method: Set(req.api_method),
            icon: Set(req.icon),
            sort: Set(req.sort.unwrap_or(0)),
            visible: Set(req.visible.unwrap_or(1)),
            status: Set(req.status.unwrap_or(1)),
            is_cache: Set(0),
            is_external: Set(0),
            created_at: Set(now),
            updated_at: Set(now),
        };
        let menu = model.insert(&self.db).await?;

        // Platform-created menus join the shared pool; every platform-tenant
        // role (the super-admin roles) should pick them up automatically so the
        // super admin never has to re-assign menus by hand after adding one.
        if current.is_platform {
            let role_ids: Vec<i64> = Role::find()
                .filter(entity::role::Column::TenantId.eq(PLATFORM_TENANT_ID))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|r| r.id)
                .collect();
            if !role_ids.is_empty() {
                let rows: Vec<entity::role_menu::ActiveModel> = role_ids
                    .iter()
                    .map(|rid| entity::role_menu::ActiveModel {
                        tenant_id: Set(PLATFORM_TENANT_ID),
                        role_id: Set(*rid),
                        menu_id: Set(menu.id),
                    })
                    .collect();
                RoleMenu::insert_many(rows).exec(&self.db).await?;
                // refresh casbin so the new menu's API is immediately grantable
                crate::permission::rebuild_all(&self.db, &self.enforcer).await?;
            }
        }
        Ok(menu)
    }

    pub async fn update_menu(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateMenuReq,
    ) -> AppResult<entity::menu::Model> {
        let menu = self.get_menu(current, id).await?;
        // tenant users cannot edit platform menus
        if !current.is_platform && menu.tenant_id == PLATFORM_TENANT_ID {
            return Err(AppError::Forbidden);
        }
        let mut active: entity::menu::ActiveModel = menu.into();
        if let Some(v) = req.parent_id {
            active.parent_id = Set(v);
        }
        if let Some(v) = req.name {
            active.name = Set(v);
        }
        if let Some(v) = req.r#type {
            active.r#type = Set(v);
        }
        if req.path.is_some() {
            active.path = Set(req.path);
        }
        if req.component.is_some() {
            active.component = Set(req.component);
        }
        if req.perm.is_some() {
            active.perm = Set(req.perm);
        }
        if req.api_path.is_some() {
            active.api_path = Set(req.api_path);
        }
        if req.api_method.is_some() {
            active.api_method = Set(req.api_method);
        }
        if let Some(v) = req.icon {
            active.icon = Set(v);
        }
        if let Some(v) = req.sort {
            active.sort = Set(v);
        }
        if let Some(v) = req.visible {
            active.visible = Set(v);
        }
        if let Some(v) = req.status {
            active.status = Set(v);
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_menu(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let menu = self.get_menu(current, id).await?;
        if !current.is_platform && menu.tenant_id == PLATFORM_TENANT_ID {
            return Err(AppError::Forbidden);
        }
        let has_children = Menu::find()
            .filter(entity::menu::Column::ParentId.eq(id))
            .one(&self.db)
            .await?
            .is_some();
        if has_children {
            return Err(AppError::bad_request("存在子菜单，无法删除"));
        }
        Menu::delete_by_id(id).exec(&self.db).await?;
        Ok(())
    }
}
