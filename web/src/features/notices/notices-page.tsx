import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import { TableToolbar } from '@/components/common/table-toolbar'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { PERM, usePermission } from '@/lib/permissions'
import {
  noticeApi,
  type CreateNoticePayload,
  type UpdateNoticePayload,
} from '@/lib/api/notice'
import type { Notice } from '@/lib/api/types'
import { NoticeDialog } from '@/features/notices/notice-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; notice: Notice }

export function NoticesPage() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.noticeCreate)
  const canUpdate = usePermission(PERM.noticeUpdate)
  const canDelete = usePermission(PERM.noticeDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const query = useQuery({
    queryKey: ['notices', { page, title: search }],
    queryFn: () =>
      noticeApi.list({ page, page_size: PAGE_SIZE, title: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['notices'] })
  }

  const saveMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateNoticePayload | UpdateNoticePayload
    }) =>
      vars.id
        ? noticeApi.update(vars.id, vars.payload)
        : noticeApi.create(vars.payload as CreateNoticePayload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => noticeApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []
  const columns: DataTableColumnDef<Notice>[] = [
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'notice_type',
      header: '类型',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.notice_type === 2 ? '公告' : '通知'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 1 ? 'default' : 'secondary'}>
          {row.original.status === 1 ? '已发布' : '草稿'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => {
        const notice = row.original
        return (
          <div className="flex justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="icon"
                title="编辑"
                onClick={() => setDialog({ kind: 'edit', notice })}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {canDelete && (
              <DeleteConfirmDialog
                title="删除通知公告"
                description="此操作不可撤销，请确认后继续。"
                targetLabel="目标公告"
                targetName={notice.title}
                onConfirm={() => removeMutation.mutateAsync(notice.id)}
                trigger={
                  <Button variant="ghost" size="icon" title="删除">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <ManagementPage title="通知公告控制台" description="编排系统通知、公告内容与发布状态。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>通知公告</CardTitle>
        {canCreate && (
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="mr-1 size-4" />
            新增公告
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <TableToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={() => {
            setPage(1)
            setSearch(keyword.trim())
          }}
          placeholder="按标题搜索"
        />
        <DataTable
          columns={columns}
          data={list}
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => void query.refetch()}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: query.data?.total ?? 0,
            onChange: setPage,
          }}
        />
      </CardContent>
      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <NoticeDialog
          editing={dialog.kind === 'edit' ? dialog.notice : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
