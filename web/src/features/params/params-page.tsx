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
  const columns: DataTableColumnDef<Param>[] = [
    {
      accessorKey: 'name',
      header: '参数名称',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'param_key',
      header: '键名',
      meta: { cellClassName: 'font-mono text-muted-foreground' },
    },
    {
      accessorKey: 'param_value',
      header: '键值',
    },
    {
      accessorKey: 'param_type',
      header: '类型',
      cell: ({ row }) => {
        const builtin = row.original.param_type === PARAM_TYPE_BUILTIN
        return (
          <Badge variant={builtin ? 'secondary' : 'outline'}>
            {builtin ? '内置' : '自定义'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => {
        const param = row.original
        const builtin = param.param_type === PARAM_TYPE_BUILTIN
        return (
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
              <DeleteConfirmDialog
                title="删除系统参数"
                description="此操作不可撤销，请确认后继续。"
                targetLabel="目标参数"
                targetName={param.name}
                onConfirm={() => removeMutation.mutateAsync(param.id)}
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
    <ManagementPage title="参数配置控制台" description="统一管理系统运行参数与配置值。">
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
        <ParamDialog
          editing={dialog.kind === 'edit' ? dialog.param : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
