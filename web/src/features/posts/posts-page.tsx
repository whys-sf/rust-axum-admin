import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { StatusBadge } from '@/components/common/status-badge'
import { ManagementPage } from '@/components/common/management-page'
import { TableToolbar } from '@/components/common/table-toolbar'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { PERM, usePermission } from '@/lib/permissions'
import { postApi, type CreatePostPayload, type UpdatePostPayload } from '@/lib/api/post'
import type { Post } from '@/lib/api/types'
import { PostDialog } from '@/features/posts/post-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; post: Post }

export function PostsPage() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.postCreate)
  const canUpdate = usePermission(PERM.postUpdate)
  const canDelete = usePermission(PERM.postDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const query = useQuery({
    queryKey: ['posts', { page, name: search }],
    queryFn: () =>
      postApi.list({ page, page_size: PAGE_SIZE, name: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['posts'] })
  }

  const saveMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreatePostPayload | UpdatePostPayload
    }) =>
      vars.id
        ? postApi.update(vars.id, vars.payload)
        : postApi.create(vars.payload as CreatePostPayload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => postApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []
  const columns: DataTableColumnDef<Post>[] = [
    {
      accessorKey: 'name',
      header: '岗位名称',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'code',
      header: '编码',
      meta: { cellClassName: 'font-mono text-muted-foreground' },
    },
    {
      accessorKey: 'sort',
      header: '排序',
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => {
        const post = row.original
        return (
          <div className="flex justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="icon"
                title="编辑"
                onClick={() => setDialog({ kind: 'edit', post })}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {canDelete && (
              <DeleteConfirmDialog
                title="删除岗位档案"
                description="此操作不可撤销，请确认后继续。"
                targetLabel="目标岗位"
                targetName={post.name}
                onConfirm={() => removeMutation.mutateAsync(post.id)}
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
    <ManagementPage title="岗位编制控制台" description="维护组织岗位、排序和启用状态。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>岗位管理</CardTitle>
        {canCreate && (
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="mr-1 size-4" />
            新增岗位
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
          placeholder="按名称搜索"
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
        <PostDialog
          editing={dialog.kind === 'edit' ? dialog.post : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
