import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/common/data-table'
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>执行日志 · {job.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <DataTable
            columns={columns}
            data={list}
            loading={query.isLoading}
            empty={list.length === 0}
            emptyTitle="暂无执行记录"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
