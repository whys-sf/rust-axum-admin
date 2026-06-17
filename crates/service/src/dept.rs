use chrono::Utc;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};

use crate::dto::{CreateDeptReq, CurrentUser, DeptNode, UpdateDeptReq};
use crate::Services;

/// The root sentinel used as `parent_id` and in the `ancestors` path of
/// top-level departments.
const ROOT_DEPT_ID: i64 = 0;

/// Assemble a flat department list into a tree rooted at `parent_id`.
pub fn build_tree(all: &[entity::dept::Model], parent_id: i64) -> Vec<DeptNode> {
    let mut nodes: Vec<DeptNode> = all
        .iter()
        .filter(|d| d.parent_id == parent_id)
        .map(|d| DeptNode {
            dept: d.clone(),
            children: build_tree(all, d.id),
        })
        .collect();
    nodes.sort_by_key(|n| n.dept.sort);
    nodes
}

impl Services {
    async fn all_depts(&self, tenant_id: i64) -> AppResult<Vec<entity::dept::Model>> {
        Ok(Dept::find()
            .filter(entity::dept::Column::TenantId.eq(tenant_id))
            .order_by_asc(entity::dept::Column::Sort)
            .all(&self.db)
            .await?)
    }

    pub async fn list_depts(&self, current: &CurrentUser) -> AppResult<Vec<DeptNode>> {
        let depts = self.all_depts(current.acting_tenant()).await?;
        Ok(build_tree(&depts, ROOT_DEPT_ID))
    }

    async fn find_dept_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::dept::Model> {
        Dept::find_by_id(id)
            .filter(entity::dept::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("部门不存在"))
    }

    pub async fn get_dept(&self, current: &CurrentUser, id: i64) -> AppResult<entity::dept::Model> {
        self.find_dept_scoped(current, id).await
    }

    /// Resolve the `ancestors` path for a department whose parent is `parent_id`.
    async fn ancestors_for_parent(
        &self,
        current: &CurrentUser,
        parent_id: i64,
    ) -> AppResult<String> {
        if parent_id == ROOT_DEPT_ID {
            return Ok(ROOT_DEPT_ID.to_string());
        }
        let parent = self.find_dept_scoped(current, parent_id).await?;
        Ok(format!("{},{}", parent.ancestors, parent.id))
    }

    pub async fn create_dept(
        &self,
        current: &CurrentUser,
        req: CreateDeptReq,
    ) -> AppResult<entity::dept::Model> {
        let tenant_id = current.acting_tenant();
        let ancestors = self.ancestors_for_parent(current, req.parent_id).await?;
        let now = Utc::now();
        let model = entity::dept::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(tenant_id),
            parent_id: Set(req.parent_id),
            ancestors: Set(ancestors),
            name: Set(req.name),
            sort: Set(req.sort.unwrap_or(0)),
            leader: Set(req.leader),
            phone: Set(req.phone),
            email: Set(req.email),
            status: Set(req.status.unwrap_or(1)),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_dept(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateDeptReq,
    ) -> AppResult<entity::dept::Model> {
        let dept = self.find_dept_scoped(current, id).await?;

        // A parent change re-roots the subtree, so recompute ancestors for this
        // department and every descendant.
        let reparent = match req.parent_id {
            Some(new_parent) if new_parent != dept.parent_id => Some(new_parent),
            _ => None,
        };
        if let Some(new_parent) = reparent {
            if new_parent == id {
                return Err(AppError::bad_request("上级部门不能是自己"));
            }
            let self_path = format!("{},{}", dept.ancestors, dept.id);
            let descendants: Vec<entity::dept::Model> = self
                .all_depts(dept.tenant_id)
                .await?
                .into_iter()
                .filter(|d| is_descendant(&d.ancestors, &self_path))
                .collect();
            if new_parent != ROOT_DEPT_ID
                && descendants.iter().any(|d| d.id == new_parent)
            {
                return Err(AppError::bad_request("上级部门不能是其下级部门"));
            }

            let new_ancestors = self.ancestors_for_parent(current, new_parent).await?;
            let new_self_path = format!("{new_ancestors},{}", dept.id);
            for d in descendants {
                let child_ancestors =
                    format!("{new_self_path}{}", &d.ancestors[self_path.len()..]);
                let mut active: entity::dept::ActiveModel = d.into();
                active.ancestors = Set(child_ancestors);
                active.updated_at = Set(Utc::now());
                active.update(&self.db).await?;
            }

            let mut active: entity::dept::ActiveModel = dept.into();
            active.parent_id = Set(new_parent);
            active.ancestors = Set(new_ancestors);
            apply_dept_fields(&mut active, &req);
            active.updated_at = Set(Utc::now());
            return Ok(active.update(&self.db).await?);
        }

        let mut active: entity::dept::ActiveModel = dept.into();
        apply_dept_fields(&mut active, &req);
        active.updated_at = Set(Utc::now());
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_dept(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let dept = self.find_dept_scoped(current, id).await?;
        let has_children = Dept::find()
            .filter(entity::dept::Column::ParentId.eq(id))
            .one(&self.db)
            .await?
            .is_some();
        if has_children {
            return Err(AppError::bad_request("存在子部门，无法删除"));
        }
        let in_use = User::find()
            .filter(entity::user::Column::DeptId.eq(id))
            .filter(entity::user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await?
            .is_some();
        if in_use {
            return Err(AppError::bad_request("部门下存在用户，无法删除"));
        }
        Dept::delete_by_id(dept.id).exec(&self.db).await?;
        Ok(())
    }

    /// Ids of `dept_id` plus every department beneath it, scoped to the tenant.
    /// Used by data-scope filtering (dept + sub-dept).
    pub async fn descendant_dept_ids(
        &self,
        tenant_id: i64,
        dept_id: i64,
    ) -> AppResult<Vec<i64>> {
        let all = Dept::find()
            .filter(entity::dept::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await?;
        let Some(root) = all.iter().find(|d| d.id == dept_id) else {
            return Ok(vec![]);
        };
        let self_path = format!("{},{}", root.ancestors, root.id);
        let mut ids = vec![dept_id];
        ids.extend(
            all.iter()
                .filter(|d| is_descendant(&d.ancestors, &self_path))
                .map(|d| d.id),
        );
        Ok(ids)
    }
}

/// Whether a node with `ancestors` lives under the subtree whose self-path is
/// `self_path` (i.e. `{parent.ancestors},{parent.id}`).
fn is_descendant(ancestors: &str, self_path: &str) -> bool {
    ancestors == self_path || ancestors.starts_with(&format!("{self_path},"))
}

fn apply_dept_fields(active: &mut entity::dept::ActiveModel, req: &UpdateDeptReq) {
    if let Some(v) = req.name.clone() {
        active.name = Set(v);
    }
    if let Some(v) = req.sort {
        active.sort = Set(v);
    }
    if req.leader.is_some() {
        active.leader = Set(req.leader.clone());
    }
    if req.phone.is_some() {
        active.phone = Set(req.phone.clone());
    }
    if req.email.is_some() {
        active.email = Set(req.email.clone());
    }
    if let Some(v) = req.status {
        active.status = Set(v);
    }
}
