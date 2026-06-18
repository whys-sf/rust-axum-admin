pub mod config;
pub mod dept;
pub mod dict_item;
pub mod dict_type;
pub mod id;
pub mod menu;
pub mod notice;
pub mod operation_log;
pub mod param;
pub mod post;
pub mod role;
pub mod role_dept;
pub mod role_menu;
pub mod tenant;
pub mod user;
pub mod user_role;

pub mod prelude {
    pub use super::config::Entity as Config;
    pub use super::dept::Entity as Dept;
    pub use super::dict_item::Entity as DictItem;
    pub use super::dict_type::Entity as DictType;
    pub use super::menu::Entity as Menu;
    pub use super::notice::Entity as Notice;
    pub use super::operation_log::Entity as OperationLog;
    pub use super::param::Entity as Param;
    pub use super::post::Entity as Post;
    pub use super::role::Entity as Role;
    pub use super::role_dept::Entity as RoleDept;
    pub use super::role_menu::Entity as RoleMenu;
    pub use super::tenant::Entity as Tenant;
    pub use super::user::Entity as User;
    pub use super::user_role::Entity as UserRole;
}
