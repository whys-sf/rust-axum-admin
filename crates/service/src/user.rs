use chrono::Utc;
use common::response::PageResult;
use common::{password, AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    Set, TransactionTrait,
};

use crate::data_scope::DataScope;
use crate::dto::{
    AssignRolesReq, ChangePasswordReq, CreateUserReq, CurrentUser, ResetPasswordReq, UpdateUserReq,
    UserDetail, UserQuery,
};
use crate::{permission, Services};

impl Services {
    pub async fn list_users(
        &self,
        current: &CurrentUser,
        query: UserQuery,
    ) -> AppResult<PageResult<entity::user::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select = User::find()
            .filter(entity::user::Column::TenantId.eq(current.acting_tenant()))
            .filter(entity::user::Column::DeletedAt.is_null());

        // row-level data permission derived from the caller's roles
        if let DataScope::Restricted {
            dept_ids,
            self_user,
        } = self.resolve_data_scope(current).await?
        {
            let mut cond = Condition::any();
            let mut matched_any = false;
            if !dept_ids.is_empty() {
                cond = cond.add(entity::user::Column::DeptId.is_in(dept_ids));
                matched_any = true;
            }
            if let Some(uid) = self_user {
                cond = cond.add(entity::user::Column::CreatedBy.eq(uid));
                matched_any = true;
            }
            // no reachable scope -> see nothing
            if !matched_any {
                cond = cond.add(entity::user::Column::Id.eq(-1));
            }
            select = select.filter(cond);
        }

        if let Some(username) = query.username.filter(|s| !s.is_empty()) {
            select = select.filter(entity::user::Column::Username.contains(&username));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::user::Column::Status.eq(status));
        }
        if let Some(dept_id) = query.dept_id {
            select = select.filter(entity::user::Column::DeptId.eq(dept_id));
        }
        let paginator = select
            .order_by_desc(entity::user::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_user_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::user::Model> {
        User::find_by_id(id)
            .filter(entity::user::Column::TenantId.eq(current.acting_tenant()))
            .filter(entity::user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("用户不存在"))
    }

    pub async fn get_user(&self, current: &CurrentUser, id: i64) -> AppResult<UserDetail> {
        let user = self.find_user_scoped(current, id).await?;
        let role_ids = UserRole::find()
            .filter(entity::user_role::Column::UserId.eq(id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|ur| ur.role_id)
            .collect();
        Ok(UserDetail { user, role_ids })
    }

    pub async fn create_user(
        &self,
        current: &CurrentUser,
        req: CreateUserReq,
    ) -> AppResult<entity::user::Model> {
        let tenant_id = current.acting_tenant();

        let dup = User::find()
            .filter(entity::user::Column::TenantId.eq(tenant_id))
            .filter(entity::user::Column::Username.eq(&req.username))
            .filter(entity::user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await?
            .is_some();
        if dup {
            return Err(AppError::conflict("用户名已存在"));
        }

        self.check_user_quota(tenant_id).await?;
        self.validate_role_ids(tenant_id, &req.role_ids).await?;

        let hashed = password::hash(&req.password).map_err(AppError::Other)?;
        let now = Utc::now();
        let user_id = self.next_id();

        let txn = self.db.begin().await?;
        let user = entity::user::ActiveModel {
            id: Set(user_id),
            tenant_id: Set(tenant_id),
            username: Set(req.username),
            password: Set(hashed),
            nickname: Set(req.nickname),
            email: Set(req.email),
            phone: Set(req.phone),
            avatar: Set(None),
            gender: Set(0),
            status: Set(req.status.unwrap_or(1)),
            dept_id: Set(req.dept_id),
            remark: Set(req.remark),
            last_login_at: Set(None),
            last_login_ip: Set(None),
            created_by: Set(Some(current.id)),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        }
        .insert(&txn)
        .await?;

        if !req.role_ids.is_empty() {
            let rows: Vec<entity::user_role::ActiveModel> = req
                .role_ids
                .iter()
                .map(|rid| entity::user_role::ActiveModel {
                    tenant_id: Set(tenant_id),
                    user_id: Set(user_id),
                    role_id: Set(*rid),
                })
                .collect();
            UserRole::insert_many(rows).exec(&txn).await?;
        }
        txn.commit().await?;

        self.sync_user_casbin(tenant_id, user_id, &req.role_ids)
            .await?;
        Ok(user)
    }

    pub async fn update_user(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateUserReq,
    ) -> AppResult<entity::user::Model> {
        let user = self.find_user_scoped(current, id).await?;
        let mut active: entity::user::ActiveModel = user.into();
        if req.nickname.is_some() {
            active.nickname = Set(req.nickname);
        }
        if req.email.is_some() {
            active.email = Set(req.email);
        }
        if req.phone.is_some() {
            active.phone = Set(req.phone);
        }
        if req.dept_id.is_some() {
            active.dept_id = Set(req.dept_id);
        }
        if let Some(status) = req.status {
            active.status = Set(status);
        }
        if req.remark.is_some() {
            active.remark = Set(req.remark);
        }
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_user(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let user = self.find_user_scoped(current, id).await?;
        if user.id == current.id {
            return Err(AppError::bad_request("不能删除自己"));
        }

        let txn = self.db.begin().await?;
        let mut active: entity::user::ActiveModel = user.clone().into();
        active.deleted_at = Set(Some(Utc::now()));
        active.update(&txn).await?;
        UserRole::delete_many()
            .filter(entity::user_role::Column::UserId.eq(id))
            .exec(&txn)
            .await?;
        txn.commit().await?;

        permission::remove_user(&self.enforcer, user.tenant_id, id).await?;
        Ok(())
    }

    pub async fn set_user_status(
        &self,
        current: &CurrentUser,
        id: i64,
        status: i16,
    ) -> AppResult<()> {
        let user = self.find_user_scoped(current, id).await?;
        let mut active: entity::user::ActiveModel = user.into();
        active.status = Set(status);
        active.updated_at = Set(Utc::now());
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn reset_password(
        &self,
        current: &CurrentUser,
        id: i64,
        req: ResetPasswordReq,
    ) -> AppResult<()> {
        let user = self.find_user_scoped(current, id).await?;
        let hashed = password::hash(&req.password).map_err(AppError::Other)?;
        let mut active: entity::user::ActiveModel = user.into();
        active.password = Set(hashed);
        active.updated_at = Set(Utc::now());
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn change_own_password(
        &self,
        current: &CurrentUser,
        req: ChangePasswordReq,
    ) -> AppResult<()> {
        let user = self.find_user_scoped(current, current.id).await?;
        if !password::verify(&req.old_password, &user.password) {
            return Err(AppError::bad_request("原密码不正确"));
        }
        let hashed = password::hash(&req.new_password).map_err(AppError::Other)?;
        let mut active: entity::user::ActiveModel = user.into();
        active.password = Set(hashed);
        active.updated_at = Set(Utc::now());
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn assign_user_roles(
        &self,
        current: &CurrentUser,
        id: i64,
        req: AssignRolesReq,
    ) -> AppResult<()> {
        let user = self.find_user_scoped(current, id).await?;
        let tenant_id = user.tenant_id;
        self.validate_role_ids(tenant_id, &req.role_ids).await?;

        let txn = self.db.begin().await?;
        UserRole::delete_many()
            .filter(entity::user_role::Column::UserId.eq(id))
            .exec(&txn)
            .await?;
        if !req.role_ids.is_empty() {
            let rows: Vec<entity::user_role::ActiveModel> = req
                .role_ids
                .iter()
                .map(|rid| entity::user_role::ActiveModel {
                    tenant_id: Set(tenant_id),
                    user_id: Set(id),
                    role_id: Set(*rid),
                })
                .collect();
            UserRole::insert_many(rows).exec(&txn).await?;
        }
        txn.commit().await?;

        self.sync_user_casbin(tenant_id, id, &req.role_ids).await?;
        Ok(())
    }

    async fn check_user_quota(&self, tenant_id: i64) -> AppResult<()> {
        let tenant = Tenant::find_by_id(tenant_id)
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("租户不存在"))?;
        if tenant.user_limit > 0 {
            let count = User::find()
                .filter(entity::user::Column::TenantId.eq(tenant_id))
                .filter(entity::user::Column::DeletedAt.is_null())
                .count(&self.db)
                .await?;
            if count as i32 >= tenant.user_limit {
                return Err(AppError::bad_request("已达到租户用户数量上限"));
            }
        }
        Ok(())
    }

    async fn validate_role_ids(&self, tenant_id: i64, role_ids: &[i64]) -> AppResult<()> {
        if role_ids.is_empty() {
            return Ok(());
        }
        let count = Role::find()
            .filter(entity::role::Column::Id.is_in(role_ids.to_vec()))
            .filter(entity::role::Column::TenantId.eq(tenant_id))
            .count(&self.db)
            .await?;
        if count as usize != role_ids.len() {
            return Err(AppError::bad_request("包含无效的角色 id"));
        }
        Ok(())
    }

    async fn sync_user_casbin(
        &self,
        tenant_id: i64,
        user_id: i64,
        role_ids: &[i64],
    ) -> AppResult<()> {
        let codes: Vec<String> = if role_ids.is_empty() {
            vec![]
        } else {
            Role::find()
                .filter(entity::role::Column::Id.is_in(role_ids.to_vec()))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|r| r.code)
                .collect()
        };
        permission::sync_user_roles(&self.enforcer, tenant_id, user_id, &codes).await
    }
}
