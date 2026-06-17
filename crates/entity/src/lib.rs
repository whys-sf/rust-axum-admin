pub mod menu;
pub mod operation_log;
pub mod role;
pub mod role_menu;
pub mod tenant;
pub mod user;
pub mod user_role;

pub mod prelude {
    pub use super::menu::Entity as Menu;
    pub use super::operation_log::Entity as OperationLog;
    pub use super::role::Entity as Role;
    pub use super::role_menu::Entity as RoleMenu;
    pub use super::tenant::Entity as Tenant;
    pub use super::user::Entity as User;
    pub use super::user_role::Entity as UserRole;
}
