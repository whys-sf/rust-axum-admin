use common::AppResult;
use entity::prelude::*;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::dto::CurrentUser;
use crate::Services;

/// Role `data_scope` values. Mirrors the column seeded on `sys_role`.
pub const SCOPE_ALL: i16 = 1;
pub const SCOPE_CUSTOM: i16 = 2;
pub const SCOPE_DEPT: i16 = 3;
pub const SCOPE_DEPT_AND_CHILD: i16 = 4;
pub const SCOPE_SELF: i16 = 5;

/// The effective row-level data permission for a caller, aggregated across all
/// of their roles. `All` short-circuits any filtering; `Restricted` is the
/// union of every contributing role's reach.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DataScope {
    All,
    Restricted {
        /// Departments whose rows are visible (own / sub-tree / custom).
        dept_ids: Vec<i64>,
        /// When set, rows created by this user are also visible (self scope).
        self_user: Option<i64>,
    },
}

impl Services {
    /// Resolve the caller's data scope from their roles. Platform admins and any
    /// user holding an `all` role see everything; otherwise the visible set is
    /// the union of each role's contribution.
    pub async fn resolve_data_scope(&self, current: &CurrentUser) -> AppResult<DataScope> {
        if current.is_platform {
            return Ok(DataScope::All);
        }
        let tenant_id = current.acting_tenant();

        let role_ids: Vec<i64> = UserRole::find()
            .filter(entity::user_role::Column::UserId.eq(current.id))
            .filter(entity::user_role::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|ur| ur.role_id)
            .collect();
        if role_ids.is_empty() {
            return Ok(DataScope::Restricted {
                dept_ids: vec![],
                self_user: Some(current.id),
            });
        }

        let roles = Role::find()
            .filter(entity::role::Column::Id.is_in(role_ids.clone()))
            .all(&self.db)
            .await?;

        let user_dept = User::find_by_id(current.id)
            .one(&self.db)
            .await?
            .and_then(|u| u.dept_id);

        let mut dept_ids: Vec<i64> = Vec::new();
        let mut self_user: Option<i64> = None;
        for role in roles {
            match role.data_scope {
                SCOPE_ALL => return Ok(DataScope::All),
                SCOPE_CUSTOM => {
                    let custom = RoleDept::find()
                        .filter(entity::role_dept::Column::RoleId.eq(role.id))
                        .all(&self.db)
                        .await?;
                    dept_ids.extend(custom.into_iter().map(|rd| rd.dept_id));
                }
                SCOPE_DEPT => {
                    if let Some(d) = user_dept {
                        dept_ids.push(d);
                    }
                }
                SCOPE_DEPT_AND_CHILD => {
                    if let Some(d) = user_dept {
                        dept_ids.extend(self.descendant_dept_ids(tenant_id, d).await?);
                    }
                }
                SCOPE_SELF => self_user = Some(current.id),
                _ => {}
            }
        }
        dept_ids.sort_unstable();
        dept_ids.dedup();
        Ok(DataScope::Restricted {
            dept_ids,
            self_user,
        })
    }

    /// Department ids the caller may see. `None` means unrestricted (see all).
    pub async fn scoped_dept_ids(&self, current: &CurrentUser) -> AppResult<Option<Vec<i64>>> {
        match self.resolve_data_scope(current).await? {
            DataScope::All => Ok(None),
            DataScope::Restricted { dept_ids, .. } => Ok(Some(dept_ids)),
        }
    }

    /// User ids the caller may see: everyone in a reachable department, plus the
    /// caller themselves when a self scope applies. `None` means unrestricted.
    pub async fn scoped_user_ids(&self, current: &CurrentUser) -> AppResult<Option<Vec<i64>>> {
        match self.resolve_data_scope(current).await? {
            DataScope::All => Ok(None),
            DataScope::Restricted {
                dept_ids,
                self_user,
            } => {
                let mut ids: Vec<i64> = Vec::new();
                if !dept_ids.is_empty() {
                    let in_dept = User::find()
                        .filter(entity::user::Column::TenantId.eq(current.acting_tenant()))
                        .filter(entity::user::Column::DeptId.is_in(dept_ids))
                        .all(&self.db)
                        .await?;
                    ids.extend(in_dept.into_iter().map(|u| u.id));
                }
                if let Some(uid) = self_user {
                    ids.push(uid);
                }
                ids.sort_unstable();
                ids.dedup();
                Ok(Some(ids))
            }
        }
    }
}
