use std::collections::HashMap;
use std::path::Path;

use common::{redis, AppError, AppResult};
use sysinfo::{Disks, ProcessesToUpdate, System};

use crate::dto::{CacheStat, ServerStat};
use crate::Services;

impl Services {
    /// Snapshot host CPU / memory / disk plus this process's memory.
    pub async fn server_stat(&self) -> AppResult<ServerStat> {
        let mut sys = System::new();
        // CPU usage needs two samples spaced by the minimum refresh interval.
        sys.refresh_cpu_usage();
        tokio::time::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL).await;
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let process_mem = sysinfo::get_current_pid()
            .ok()
            .map(|pid| {
                sys.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);
                sys.process(pid).map(|p| p.memory()).unwrap_or(0)
            })
            .unwrap_or(0);

        let disks = Disks::new_with_refreshed_list();
        let root = Path::new("/");
        let primary = disks
            .list()
            .iter()
            .find(|d| d.mount_point() == root)
            .or_else(|| disks.list().first());
        let (disk_total, disk_avail) = primary
            .map(|d| (d.total_space(), d.available_space()))
            .unwrap_or((0, 0));

        Ok(ServerStat {
            cpu_usage: sys.global_cpu_usage(),
            cpu_cores: sys.cpus().len(),
            mem_total: sys.total_memory(),
            mem_used: sys.used_memory(),
            swap_total: sys.total_swap(),
            swap_used: sys.used_swap(),
            disk_total,
            disk_used: disk_total.saturating_sub(disk_avail),
            uptime_secs: System::uptime(),
            os_name: System::long_os_version().unwrap_or_default(),
            kernel_version: System::kernel_version().unwrap_or_default(),
            host_name: System::host_name().unwrap_or_default(),
            process_mem,
        })
    }

    /// Parse selected fields out of the Redis `INFO` report.
    pub async fn cache_stat(&self) -> AppResult<CacheStat> {
        let (info, db_size) = redis::server_info(&self.redis)
            .await
            .map_err(AppError::Other)?;
        let map = parse_info(&info);
        let num = |k: &str| map.get(k).and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
        let text = |k: &str| map.get(k).cloned().unwrap_or_default();

        Ok(CacheStat {
            version: text("redis_version"),
            mode: text("redis_mode"),
            uptime_secs: num("uptime_in_seconds"),
            connected_clients: num("connected_clients"),
            used_memory: num("used_memory"),
            used_memory_human: text("used_memory_human"),
            max_memory: num("maxmemory"),
            total_commands: num("total_commands_processed"),
            keyspace_hits: num("keyspace_hits"),
            keyspace_misses: num("keyspace_misses"),
            db_size,
        })
    }
}

/// Turn a Redis `INFO` blob (`key:value` lines, `#`-prefixed section headers)
/// into a flat map.
fn parse_info(info: &str) -> HashMap<String, String> {
    info.lines()
        .filter(|l| !l.starts_with('#') && !l.trim().is_empty())
        .filter_map(|l| l.split_once(':'))
        .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
        .collect()
}
