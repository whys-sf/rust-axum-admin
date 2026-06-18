import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { jobApi } from '@/lib/api/job'
import type { Job } from '@/lib/api/types'

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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>执行日志 · {job.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>结果</TableHead>
                <TableHead>信息</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>开始时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    暂无执行记录
                  </TableCell>
                </TableRow>
              ) : (
                list.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.status === 1 ? (
                        <Badge variant="outline">成功</Badge>
                      ) : (
                        <Badge variant="destructive">失败</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={log.message}>
                      {log.message}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.duration_ms}ms
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.started_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
