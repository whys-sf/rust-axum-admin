import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Play, Plus, ScrollText, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PagePagination } from '@/components/common/page-pagination'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import {
  jobApi,
  type CreateJobPayload,
  type UpdateJobPayload,
} from '@/lib/api/job'
import type { Job } from '@/lib/api/types'
import { JobDialog } from '@/features/jobs/job-dialog'
import { JobLogsDialog } from '@/features/jobs/job-logs-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; job: Job }
  | { kind: 'logs'; job: Job }

function fmt(ts?: string | null) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

export function JobsPage() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.jobCreate)
  const canUpdate = usePermission(PERM.jobUpdate)
  const canDelete = usePermission(PERM.jobDelete)
  const canRun = usePermission(PERM.jobRun)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const query = useQuery({
    queryKey: ['jobs', { page, name: search }],
    queryFn: () =>
      jobApi.list({ page, page_size: PAGE_SIZE, name: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['jobs'] })
  }

  const saveMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateJobPayload | UpdateJobPayload
    }) =>
      vars.id
        ? jobApi.update(vars.id, vars.payload)
        : jobApi.create(vars.payload as CreateJobPayload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: number }) =>
      jobApi.setStatus(vars.id, vars.status),
    onSuccess: () => invalidate(),
  })
  const runMutation = useMutation({
    mutationFn: (id: string) => jobApi.run(id),
    onSuccess: (log) => {
      toast[log.status === 1 ? 'success' : 'error'](
        log.status === 1 ? `执行成功：${log.message}` : `执行失败：${log.message}`,
      )
      invalidate()
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => jobApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []

  return (
    <ManagementPage title="任务调度控制台" description="管理计划任务、执行周期和运行记录。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>定时任务</CardTitle>
        {canCreate && (
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="mr-1 size-4" />
            新增任务
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            setSearch(keyword.trim())
          }}
        >
          <Input
            placeholder="按名称搜索"
            value={keyword}
            className="max-w-xs"
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search className="mr-1 size-4" />
            搜索
          </Button>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务名称</TableHead>
              <TableHead>调用目标</TableHead>
              <TableHead>Cron</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>上次 / 下次执行</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {job.invoke_target}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {job.cron_expr}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.status === 1}
                        disabled={!canUpdate || statusMutation.isPending}
                        onCheckedChange={(c) =>
                          statusMutation.mutate({
                            id: job.id,
                            status: c ? 1 : 0,
                          })
                        }
                      />
                      <Badge variant={job.status === 1 ? 'default' : 'secondary'}>
                        {job.status === 1 ? '运行中' : '暂停'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{fmt(job.last_run_at)}</div>
                    <div>{fmt(job.next_run_at)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canRun && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="立即执行"
                          disabled={runMutation.isPending}
                          onClick={() => runMutation.mutate(job.id)}
                        >
                          <Play className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="执行日志"
                        onClick={() => setDialog({ kind: 'logs', job })}
                      >
                        <ScrollText className="size-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="编辑"
                          onClick={() => setDialog({ kind: 'edit', job })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <ConfirmDialog
                          description={`确定删除任务「${job.name}」吗？`}
                          onConfirm={() => removeMutation.mutateAsync(job.id)}
                          trigger={
                            <Button variant="ghost" size="icon" title="删除">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PagePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data?.total ?? 0}
          onChange={setPage}
        />
      </CardContent>
      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <JobDialog
          editing={dialog.kind === 'edit' ? dialog.job : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
      {dialog.kind === 'logs' && (
        <JobLogsDialog
          job={dialog.job}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
