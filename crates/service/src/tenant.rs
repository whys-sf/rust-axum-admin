use chrono::Utc;
use common::response::PageResult;
use common::{password, AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

use crate::dto::{CreateTenantReq, PageQuery, UpdateTenantReq};
use crate::{permission, Services, PLATFORM_TENANT_ID};

impl Services {
    pub async fn list_tenants(
        &self,
        page: PageQuery,
        keyword: Option<String>,
    ) -> AppResult<PageResult<entity::tenant::Model>> {
        let (page_no, page_size) = page.normalized();
        let mut select = Tenant::find().filter(entity::tenant::Column::Id.ne(PLATFORM_TENANT_ID));
        if let Some(kw) = keyword.filter(|s| !s.is_empty()) {
            select = select.filter(
                entity::tenant::Column::Name
                    .contains(&kw)
                    .or(entity::tenant::Column::Code.contains(&kw)),
            );
        }
        let paginator = select
            .order_by_desc(entity::tenant::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page_no - 1).await?;
        Ok(PageResult::new(list, total, page_no, page_size))
    }

    pub async fn get_tenant(&self, id: i64) -> AppResult<entity::tenant::Model> {
        Tenant::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("租户不存在"))
    }

    pub async fn create_tenant(&self, req: CreateTenantReq) -> AppResult<entity::tenant::Model> {
        let dup = Tenant::find()
            .filter(entity::tenant::Column::Code.eq(&req.code))
            .one(&self.db)
            .await?
            .is_some();
        if dup {
            return Err(AppError::conflict("租户标识已存在"));
        }

        let now = Utc::now();
        let tenant_id = self.next_id();
        let role_id = self.next_id();
        let user_id = self.next_id();
        let hashed = password::hash(&req.admin_password).map_err(AppError::Other)?;

        // platform menus this tenant's admin will inherit
        let platform_menus = Menu::find()
            .filter(entity::menu::Column::TenantId.eq(PLATFORM_TENANT_ID))
            .all(&self.db)
            .await?;

        let txn = self.db.begin().await?;

        let tenant = entity::tenant::ActiveModel {
            id: Set(tenant_id),
            name: Set(req.name),
            code: Set(req.code),
            contact_name: Set(req.contact_name),
            contact_phone: Set(req.contact_phone),
            domain: Set(None),
            package_id: Set(None),
            user_limit: Set(req.user_limit.unwrap_or(0)),
            status: Set(1),
            expire_at: Set(req.expire_at),
            remark: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&txn)
        .await?;

        entity::role::ActiveModel {
            id: Set(role_id),
            tenant_id: Set(tenant_id),
            name: Set("租户管理员".to_string()),
            code: Set("admin".to_string()),
            sort: Set(0),
            status: Set(1),
            data_scope: Set(1),
            remark: Set(Some("租户内置管理员".to_string())),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&txn)
        .await?;

        entity::user::ActiveModel {
            id: Set(user_id),
            tenant_id: Set(tenant_id),
            username: Set(req.admin_username),
            password: Set(hashed),
            nickname: Set(Some("租户管理员".to_string())),
            email: Set(None),
            phone: Set(None),
            avatar: Set(None),
            gender: Set(0),
            status: Set(1),
            dept_id: Set(None),
            remark: Set(None),
            last_login_at: Set(None),
            last_login_ip: Set(None),
            created_by: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        }
        .insert(&txn)
        .await?;

        entity::user_role::ActiveModel {
            tenant_id: Set(tenant_id),
            user_id: Set(user_id),
            role_id: Set(role_id),
        }
        .insert(&txn)
        .await?;

        if !platform_menus.is_empty() {
            let rows: Vec<entity::role_menu::ActiveModel> = platform_menus
                .iter()
                .map(|m| entity::role_menu::ActiveModel {
                    tenant_id: Set(tenant_id),
                    role_id: Set(role_id),
                    menu_id: Set(m.id),
                })
                .collect();
            RoleMenu::insert_many(rows).exec(&txn).await?;
        }

        txn.commit().await?;

        // sync casbin: admin role gets every platform menu API; bind admin user
        let apis: Vec<(String, String)> = platform_menus
            .into_iter()
            .filter_map(|m| match (m.api_path, m.api_method) {
                (Some(p), Some(method)) if !p.is_empty() && !method.is_empty() => Some((p, method)),
                _ => None,
            })
            .collect();
        permission::sync_role_policies(&self.enforcer, tenant_id, "admin", apis).await?;
        permission::sync_user_roles(&self.enforcer, tenant_id, user_id, &["admin".to_string()])
            .await?;

        Ok(tenant)
    }

    pub async fn update_tenant(
        &self,
        id: i64,
        req: UpdateTenantReq,
    ) -> AppResult<entity::tenant::Model> {
        let tenant = self.get_tenant(id).await?;
        if tenant.id == PLATFORM_TENANT_ID {
            return Err(AppError::bad_request("平台租户不可修改"));
        }
        let mut active: entity::tenant::ActiveModel = tenant.into();
        if let Some(v) = req.name {
            active.name = Set(v);
        }
        if req.contact_name.is_some() {
            active.contact_name = Set(req.contact_name);
        }
        if req.contact_phone.is_some() {
            active.contact_phone = Set(req.contact_phone);
        }
        if let Some(v) = req.user_limit {
            active.user_limit = Set(v);
        }
        if req.expire_at.is_some() {
            active.expire_at = Set(req.expire_at);
        }
        if req.remark.is_some() {
            active.remark = Set(req.remark);
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn set_tenant_status(&self, id: i64, status: i16) -> AppResult<()> {
        let tenant = self.get_tenant(id).await?;
        if tenant.id == PLATFORM_TENANT_ID {
            return Err(AppError::bad_request("平台租户不可禁用"));
        }
        let mut active: entity::tenant::ActiveModel = tenant.into();
        active.status = Set(status);
        active.updated_at = Set(Utc::now());
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn delete_tenant(&self, id: i64) -> AppResult<()> {
        let tenant = self.get_tenant(id).await?;
        if tenant.id == PLATFORM_TENANT_ID {
            return Err(AppError::bad_request("平台租户不可删除"));
        }

        let txn = self.db.begin().await?;
        RoleMenu::delete_many()
            .filter(entity::role_menu::Column::TenantId.eq(id))
            .exec(&txn)
            .await?;
        UserRole::delete_many()
            .filter(entity::user_role::Column::TenantId.eq(id))
            .exec(&txn)
            .await?;
        User::delete_many()
            .filter(entity::user::Column::TenantId.eq(id))
            .exec(&txn)
            .await?;
        Role::delete_many()
            .filter(entity::role::Column::TenantId.eq(id))
            .exec(&txn)
            .await?;
        Menu::delete_many()
            .filter(entity::menu::Column::TenantId.eq(id))
            .exec(&txn)
            .await?;
        Tenant::delete_by_id(id).exec(&txn).await?;
        txn.commit().await?;

        // drop casbin policies for the whole domain
        {
            use casbin::MgmtApi;
            let d = id.to_string();
            let mut e = self.enforcer.write().await;
            e.remove_filtered_policy(1, vec![d.clone()]).await?;
            e.remove_filtered_grouping_policy(2, vec![d]).await?;
        }
        Ok(())
    }
}
