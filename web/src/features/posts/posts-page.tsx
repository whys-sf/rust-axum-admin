import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { StatusBadge } from '@/components/common/status-badge'
import { PagePagination } from '@/components/common/page-pagination'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import {
  postApi,
  type CreatePostPayload,
  type UpdatePostPayload,
} from '@/lib/api/post'
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
              <TableHead>岗位名称</TableHead>
              <TableHead>编码</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {post.code}
                  </TableCell>
                  <TableCell>{post.sort}</TableCell>
                  <TableCell>
                    <StatusBadge status={post.status} />
                  </TableCell>
                  <TableCell className="text-right">
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
                        <ConfirmDialog
                          description={`确定删除岗位「${post.name}」吗？`}
                          onConfirm={() => removeMutation.mutateAsync(post.id)}
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
