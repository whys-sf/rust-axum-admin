import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { jobApi } from '@/lib/api/job'
import type { Job, JobLog } from '@/lib/api/types'

interface JobLogsDialogProps {
  job: Job
  onClose: () => void
}

export function JobLogsDialog({ job, onClose }: JobLogsDialogProps) {
  const query = useQuery({
    queryKey: ['job-logs', job.id],
    queryFn: () => jobApi.logs({ job_id: job.id, page: 1, page_size: 20 }),
  })

  const list = query.data?.list ?? []
  const columns: DataTableColumnDef<JobLog>[] = [
    {
      header: '结果',
      cell: ({ row }) =>
        row.original.status === 1 ? (
          <Badge variant="outline">成功</Badge>
        ) : (
          <Badge variant="destructive">失败</Badge>
        ),
    },
    {
      header: '信息',
      meta: { cellClassName: 'max-w-xs truncate' },
      cell: ({ row }) => <span title={row.original.message}>{row.original.message}</span>,
    },
    {
      header: '耗时',
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => `${row.original.duration_ms}ms`,
    },
    {
      header: '开始时间',
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => new Date(row.original.started_at).toLocaleString(),
    },
  ]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={ScrollText}
          eyebrow="任务日志"
          title={<>执行日志 · {job.name}</>}
          description="查看该调度任务最近的执行结果、耗时和开始时间。"
          aside={(
            <div className="relative shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                记录数
              </p>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                {list.length} 条
              </p>
            </div>
          )}
        />
        <ScrollArea className="max-h-[60vh]">
          <div className="px-5 py-7 sm:px-7">
          <DataTable
            columns={columns}
            data={list}
            loading={query.isLoading}
            empty={list.length === 0}
            emptyTitle="暂无执行记录"
          />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
