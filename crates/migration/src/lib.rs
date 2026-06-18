pub use sea_orm_migration::prelude::*;

mod m20240101_000001_init;
mod m20240101_000002_seed;
mod m20240101_000003_dept;
mod m20240101_000004_role_dept;
mod m20240101_000005_backfill_menus;
mod m20240101_000006_config;
mod m20240101_000007_dict;
mod m20240101_000008_post_param_notice;

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
        ]
    }
}
