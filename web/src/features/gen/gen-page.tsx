import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Code2, Download, Eye, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import { genApi } from '@/lib/api/gen'
import type { GenTable } from '@/lib/api/types'
import { ImportDialog } from '@/features/gen/import-dialog'
import { ConfigDialog } from '@/features/gen/config-dialog'
import { PreviewDialog } from '@/features/gen/preview-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'import' }
  | { kind: 'config'; table: GenTable }
  | { kind: 'preview'; table: GenTable }

export function GenPage() {
  const qc = useQueryClient()
  const canImport = usePermission(PERM.genImport)
  const canEdit = usePermission(PERM.genEdit)
  const canDelete = usePermission(PERM.genDelete)
  const canPreview = usePermission(PERM.genPreview)

  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const query = useQuery({
    queryKey: ['gen-tables', { page }],
    queryFn: () => genApi.list({ page, page_size: PAGE_SIZE }),
  })

  const importMutation = useMutation({
    mutationFn: (tables: string[]) => genApi.import(tables),
    onSuccess: (count) => {
      toast.success(`已导入 ${count} 张表`)
      qc.invalidateQueries({ queryKey: ['gen-tables'] })
      qc.invalidateQueries({ queryKey: ['gen-db-tables'] })
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => genApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: ['gen-tables'] })
    },
  })

  const list = query.data?.list ?? []

  const columns: DataTableColumnDef<GenTable>[] = [
    {
      accessorKey: 'table_name',
      header: '表名',
      cell: ({ row }) => <span className="font-mono">{row.original.table_name}</span>,
    },
    {
      accessorKey: 'class_name',
      header: '类名',
    },
    {
      accessorKey: 'module_name',
      header: '模块名',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.module_name}</span>
      ),
    },
    {
      accessorKey: 'function_name',
      header: '业务名称',
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      cell: ({ row }) => {
        const t = row.original
        return (
          <div className="flex justify-end gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                title="配置"
                onClick={() => setDialog({ kind: 'config', table: t })}
              >
                <Settings2 className="size-4" />
              </Button>
            )}
            {canPreview && (
              <Button
                variant="ghost"
                size="icon"
                title="预览"
                onClick={() => setDialog({ kind: 'preview', table: t })}
              >
                <Eye className="size-4" />
              </Button>
            )}
            {canPreview && (
              <Button
                variant="ghost"
                size="icon"
                title="下载 zip"
                onClick={() => genApi.download(t.id, t.module_name)}
              >
                <Download className="size-4" />
              </Button>
            )}
            {canDelete && (
              <ConfirmDialog
                description={`确定删除「${t.table_name}」的生成配置吗？`}
                onConfirm={() => removeMutation.mutateAsync(t.id)}
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
    <ManagementPage title="代码生成控制台" description="从数据模型生成一致、可维护的业务代码。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-5" />
          代码生成器
        </CardTitle>
        {canImport && (
          <Button onClick={() => setDialog({ kind: 'import' })}>
            <Plus className="mr-1 size-4" />
            导入表
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={list}
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => void query.refetch()}
          emptyTitle="暂无数据"
          emptyDescription="点击「导入表」开始"
          pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onChange: setPage }}
        />
      </CardContent>
      {dialog.kind === 'import' && (
        <ImportDialog
          importing={importMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onImport={(tables) => importMutation.mutate(tables)}
        />
      )}
      {dialog.kind === 'config' && (
        <ConfigDialog
          tableId={dialog.table.id}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
      {dialog.kind === 'preview' && (
        <PreviewDialog
          tableId={dialog.table.id}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
