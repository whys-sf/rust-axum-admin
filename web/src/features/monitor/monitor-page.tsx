import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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

function Metric({
  label,
  value,
  percent,
}: {
  label: string
  value: string
  percent?: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums">{value}</span>
      </div>
      {percent !== undefined && <Progress value={percent} />}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
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
  const hitRate =
    c && c.keyspace_hits + c.keyspace_misses > 0
      ? `${((c.keyspace_hits / (c.keyspace_hits + c.keyspace_misses)) * 100).toFixed(1)}%`
      : '—'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            server.refetch()
            cache.refetch()
          }}
          disabled={server.isFetching || cache.isFetching}
        >
          <RefreshCw className="mr-1 size-4" />
          刷新
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>服务器</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s ? (
              <>
                <Metric
                  label="CPU 使用率"
                  value={`${s.cpu_usage.toFixed(1)}%`}
                  percent={Math.round(s.cpu_usage)}
                />
                <Metric
                  label="内存"
                  value={`${formatBytes(s.mem_used)} / ${formatBytes(s.mem_total)}`}
                  percent={pct(s.mem_used, s.mem_total)}
                />
                <Metric
                  label="磁盘"
                  value={`${formatBytes(s.disk_used)} / ${formatBytes(s.disk_total)}`}
                  percent={pct(s.disk_used, s.disk_total)}
                />
                {s.swap_total > 0 && (
                  <Metric
                    label="交换分区"
                    value={`${formatBytes(s.swap_used)} / ${formatBytes(s.swap_total)}`}
                    percent={pct(s.swap_used, s.swap_total)}
                  />
                )}
                <div className="pt-2">
                  <Field label="CPU 核心" value={`${s.cpu_cores}`} />
                  <Field label="进程内存" value={formatBytes(s.process_mem)} />
                  <Field label="操作系统" value={s.os_name || '—'} />
                  <Field label="内核" value={s.kernel_version || '—'} />
                  <Field label="主机名" value={s.host_name || '—'} />
                  <Field label="运行时长" value={formatUptime(s.uptime_secs)} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">加载中...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redis 缓存</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {c ? (
              <>
                <Metric
                  label="已用内存"
                  value={
                    c.max_memory > 0
                      ? `${formatBytes(c.used_memory)} / ${formatBytes(c.max_memory)}`
                      : formatBytes(c.used_memory)
                  }
                  percent={c.max_memory > 0 ? pct(c.used_memory, c.max_memory) : undefined}
                />
                <div className="pt-2">
                  <Field label="版本" value={c.version || '—'} />
                  <Field label="运行模式" value={c.mode || '—'} />
                  <Field label="客户端连接" value={`${c.connected_clients}`} />
                  <Field label="键数量" value={`${c.db_size}`} />
                  <Field
                    label="命中 / 未命中"
                    value={`${c.keyspace_hits} / ${c.keyspace_misses}`}
                  />
                  <Field label="命中率" value={hitRate} />
                  <Field label="累计命令数" value={`${c.total_commands}`} />
                  <Field label="运行时长" value={formatUptime(c.uptime_secs)} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">加载中...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
