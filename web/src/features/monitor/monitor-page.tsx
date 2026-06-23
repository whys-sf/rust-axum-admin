import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Boxes,
  CircleAlert,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Server,
  ShieldCheck,
  Terminal,
  Timer,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { monitorApi } from '@/lib/api/monitor'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d} 天`)
  if (h) parts.push(`${h} 时`)
  parts.push(`${m} 分`)
  return parts.join(' ')
}

function pct(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function ResourceGauge({
  icon: Icon,
  label,
  value,
  percent,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  percent: number
  detail: string
}) {
  const critical = percent >= 90
  const elevated = percent >= 75
  const state = critical ? '负载较高' : elevated ? '持续关注' : '运行平稳'

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
      <div className="absolute -top-12 -right-12 size-32 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <Icon className="size-4 text-primary" />
            {label}
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>

        <div
          className={`relative grid size-20 shrink-0 place-items-center ${
            critical ? 'text-destructive' : 'text-primary'
          }`}
        >
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              pathLength="100"
              stroke="currentColor"
              strokeDasharray="100"
              strokeDashoffset={100 - percent}
              strokeLinecap="round"
              strokeWidth="7"
              className="transition-all duration-700"
            />
          </svg>
          <span className="font-mono text-sm font-bold tabular-nums">{percent}%</span>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-dashed pt-3 text-xs">
        <span className="text-muted-foreground">当前状态</span>
        <span
          className={
            critical
              ? 'font-medium text-destructive'
              : elevated
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : 'font-medium text-primary'
          }
        >
          {state}
        </span>
      </div>
    </article>
  )
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/45 px-3.5 py-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-primary ring-1 ring-foreground/8">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium tabular-nums" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="size-20 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-8 w-full" />
    </div>
  )
}

export function MonitorPage() {
  const server = useQuery({
    queryKey: ['monitor-server'],
    queryFn: monitorApi.server,
    refetchInterval: 5_000,
  })
  const cache = useQuery({
    queryKey: ['monitor-cache'],
    queryFn: monitorApi.cache,
    refetchInterval: 5_000,
  })

  const s = server.data
  const c = cache.data
  const cpuPercent = s ? Math.min(100, Math.round(s.cpu_usage)) : 0
  const memoryPercent = s ? pct(s.mem_used, s.mem_total) : 0
  const diskPercent = s ? pct(s.disk_used, s.disk_total) : 0
  const cacheRequests = c ? c.keyspace_hits + c.keyspace_misses : 0
  const hitRateValue = c && cacheRequests > 0 ? (c.keyspace_hits / cacheRequests) * 100 : 0
  const hitRate = cacheRequests > 0 ? `${hitRateValue.toFixed(1)}%` : '—'
  const hasError = server.isError || cache.isError
  const isFetching = server.isFetching || cache.isFetching
  const lastUpdatedAt = Math.max(server.dataUpdatedAt, cache.dataUpdatedAt)
  const lastUpdated = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '等待数据'

  return (
    <div className="space-y-5 pb-8">
      <section className="control-grid relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/10 sm:p-7">
        <div className="absolute -top-24 -right-20 size-64 rounded-full border border-primary-foreground/10" />
        <div className="absolute -top-10 -right-6 size-36 rounded-full border border-primary-foreground/10" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-primary-foreground/75 uppercase">
              <Activity className="size-4" />
              System telemetry
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              运行态指挥台
            </h1>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              每 5 秒采集服务器与 Redis 运行指标，快速识别资源压力和缓存异常。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 py-2.5 backdrop-blur-sm">
              <span className="relative flex size-2">
                {isFetching && !hasError && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    hasError ? 'bg-destructive' : 'bg-emerald-300'
                  }`}
                />
              </span>
              <div>
                <p className="text-[9px] tracking-wider text-primary-foreground/60 uppercase">
                  采集状态
                </p>
                <p className="text-xs font-semibold">
                  {hasError ? '部分数据异常' : '实时在线'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 py-2.5 backdrop-blur-sm">
              <p className="text-[9px] tracking-wider text-primary-foreground/60 uppercase">
                最近更新
              </p>
              <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums">{lastUpdated}</p>
            </div>

          </div>
        </div>
      </section>

      {hasError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">监控数据未完全同步</p>
            <p className="mt-0.5 text-xs opacity-80">系统会继续自动重试，也可以手动刷新。</p>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
              Resource pressure
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">资源压力</h2>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">占用率达到 90% 时标记为高负载</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {s ? (
            <>
              <ResourceGauge
                icon={Cpu}
                label="CPU"
                value={`${s.cpu_usage.toFixed(1)}%`}
                percent={cpuPercent}
                detail={`${s.cpu_cores} 核心 · 实时负载`}
              />
              <ResourceGauge
                icon={MemoryStick}
                label="内存"
                value={formatBytes(s.mem_used)}
                percent={memoryPercent}
                detail={`总容量 ${formatBytes(s.mem_total)}`}
              />
              <ResourceGauge
                icon={HardDrive}
                label="磁盘"
                value={formatBytes(s.disk_used)}
                percent={diskPercent}
                detail={`总容量 ${formatBytes(s.disk_total)}`}
              />
            </>
          ) : (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="self-start rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
                <Server className="size-4" />
                Host environment
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">主机环境</h2>
              <p className="mt-1 text-xs text-muted-foreground">操作系统、运行进程与节点身份</p>
            </div>
            {s && (
              <div className="rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                已运行 {formatUptime(s.uptime_secs)}
              </div>
            )}
          </div>

          {s ? (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem icon={Server} label="主机名称" value={s.host_name || '—'} />
              <DetailItem icon={Terminal} label="操作系统" value={s.os_name || '—'} />
              <DetailItem icon={ShieldCheck} label="内核版本" value={s.kernel_version || '—'} />
              <DetailItem icon={Cpu} label="CPU 核心" value={`${s.cpu_cores} 核`} />
              <DetailItem icon={MemoryStick} label="进程内存" value={formatBytes(s.process_mem)} />
              <DetailItem
                icon={Boxes}
                label="交换分区"
                value={
                  s.swap_total > 0
                    ? `${formatBytes(s.swap_used)} / ${formatBytes(s.swap_total)}`
                    : '未启用'
                }
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          )}
        </section>

        <section className="group relative self-start overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="absolute -top-16 -right-16 size-44 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute -bottom-10 -left-10 size-28 rounded-full bg-primary/3" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
                <Database className="size-4" />
                Redis efficiency
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">缓存效能</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Redis {c?.version || '—'} · {c?.mode || '等待连接'}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15">
              <Zap className="size-5" />
            </div>
          </div>

          {c ? (
            <>
              <div className="relative mt-6 flex items-end justify-between gap-4 border-b border-dashed pb-5">
                <div>
                  <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                    缓存命中率
                  </p>
                  <p
                    className={`mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums ${
                      cacheRequests > 100 && hitRateValue < 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : ''
                    }`}
                  >
                    {hitRate}
                  </p>
                </div>
                <p className="text-right text-xs leading-5 text-muted-foreground">
                  {formatNumber(c.keyspace_hits)} 次命中
                  <br />
                  {formatNumber(c.keyspace_misses)} 次未命中
                </p>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-muted/45 px-3 py-3">
                  <p className="text-[9px] tracking-wider text-muted-foreground uppercase">
                    已用内存
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatBytes(c.used_memory)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/45 px-3 py-3">
                  <p className="text-[9px] tracking-wider text-muted-foreground uppercase">
                    客户端
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatNumber(c.connected_clients)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/45 px-3 py-3">
                  <p className="text-[9px] tracking-wider text-muted-foreground uppercase">
                    键数量
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatNumber(c.db_size)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/45 px-3 py-3">
                  <p className="text-[9px] tracking-wider text-muted-foreground uppercase">
                    累计命令
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatNumber(c.total_commands)}
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Timer className="size-3.5" />
                Redis 已运行 {formatUptime(c.uptime_secs)}
              </div>
            </>
          ) : (
            <div className="relative mt-6 space-y-3">
              <Skeleton className="h-20" />
              <div className="grid grid-cols-2 gap-2.5">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
