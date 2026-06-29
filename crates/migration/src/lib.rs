pub use sea_orm_migration::prelude::*;

mod m20240101_000001_init;
mod m20240101_000002_seed;
mod m20240101_000003_dept;
mod m20240101_000004_role_dept;
mod m20240101_000005_backfill_menus;
mod m20240101_000006_config;
mod m20240101_000007_dict;
mod m20240101_000008_post_param_notice;
mod m20240101_000009_message;
mod m20240101_000010_job;
mod m20240101_000011_gen;
mod m20240101_000012_file;
mod m20240101_000013_online_monitor;
mod m20240101_000014_read_detail_perms;
mod m20240101_000015_grant_platform_roles_menus;
mod m20240101_000016_menu_route_icons;
mod m20240101_000017_file_folder;
mod m20240101_000018_tenant_config;
mod m20240101_000019_package_feature;
mod m20240101_000020_package_menu;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240101_000001_init::Migration),
            Box::new(m20240101_000002_seed::Migration),
            Box::new(m20240101_000003_dept::Migration),
            Box::new(m20240101_000004_role_dept::Migration),
            Box::new(m20240101_000005_backfill_menus::Migration),
            Box::new(m20240101_000006_config::Migration),
            Box::new(m20240101_000007_dict::Migration),
            Box::new(m20240101_000008_post_param_notice::Migration),
            Box::new(m20240101_000009_message::Migration),
            Box::new(m20240101_000010_job::Migration),
            Box::new(m20240101_000011_gen::Migration),
            Box::new(m20240101_000012_file::Migration),
            Box::new(m20240101_000013_online_monitor::Migration),
            Box::new(m20240101_000014_read_detail_perms::Migration),
            Box::new(m20240101_000015_grant_platform_roles_menus::Migration),
            Box::new(m20240101_000016_menu_route_icons::Migration),
            Box::new(m20240101_000017_file_folder::Migration),
            Box::new(m20240101_000018_tenant_config::Migration),
            Box::new(m20240101_000019_package_feature::Migration),
            Box::new(m20240101_000020_package_menu::Migration),
        ]
    }
}
