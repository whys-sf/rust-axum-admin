import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { PERM, usePermission } from '@/lib/permissions'
import {
  paramApi,
  type CreateParamPayload,
  type UpdateParamPayload,
} from '@/lib/api/param'
import type { Param } from '@/lib/api/types'
import { ParamDialog } from '@/features/params/param-dialog'

const PAGE_SIZE = 10
const PARAM_TYPE_BUILTIN = 1

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; param: Param }

export function ParamsPage() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.paramCreate)
  const canUpdate = usePermission(PERM.paramUpdate)
  const canDelete = usePermission(PERM.paramDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const query = useQuery({
    queryKey: ['params', { page, name: search }],
    queryFn: () =>
      paramApi.list({ page, page_size: PAGE_SIZE, name: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['params'] })
  }

  const saveMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateParamPayload | UpdateParamPayload
    }) =>
      vars.id
        ? paramApi.update(vars.id, vars.payload)
        : paramApi.create(vars.payload as CreateParamPayload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => paramApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>参数配置</CardTitle>
        {canCreate && (
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="mr-1 size-4" />
            新增参数
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
              <TableHead>参数名称</TableHead>
              <TableHead>键名</TableHead>
              <TableHead>键值</TableHead>
              <TableHead>类型</TableHead>
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
              list.map((param) => {
                const builtin = param.param_type === PARAM_TYPE_BUILTIN
                return (
                  <TableRow key={param.id}>
                    <TableCell className="font-medium">{param.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {param.param_key}
                    </TableCell>
                    <TableCell>{param.param_value}</TableCell>
                    <TableCell>
                      <Badge variant={builtin ? 'secondary' : 'outline'}>
                        {builtin ? '内置' : '自定义'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="编辑"
                            onClick={() => setDialog({ kind: 'edit', param })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && !builtin && (
                          <ConfirmDialog
                            description={`确定删除参数「${param.name}」吗？`}
                            onConfirm={() =>
                              removeMutation.mutateAsync(param.id)
                            }
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
                )
              })
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
        <ParamDialog
          editing={dialog.kind === 'edit' ? dialog.param : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </Card>
  )
}
