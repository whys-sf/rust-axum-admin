import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/common/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { StatusBadge } from '@/components/common/status-badge'
import { ManagementPage } from '@/components/common/management-page'
import { deptApi, type CreateDeptPayload } from '@/lib/api/dept'
import { flattenTree } from '@/lib/tree'
import type { DeptNode } from '@/lib/api/types'
import { DeptDialog } from '@/features/depts/dept-dialog'

interface DeptTableRow {
  node: DeptNode
  depth: number
}

export function DeptsPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<{
    open: boolean
    editing?: DeptNode
    parentId?: string
  }>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['depts'],
    queryFn: deptApi.list,
  })

  const options = useMemo(() => flattenTree(data ?? []), [data])

  const removeMutation = useMutation({
    mutationFn: (id: string) => deptApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: ['depts'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: string; payload: CreateDeptPayload }) =>
      vars.id
        ? deptApi.update(vars.id, vars.payload)
        : deptApi.create(vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      qc.invalidateQueries({ queryKey: ['depts'] })
      setDialog({ open: false })
    },
  })

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rows = useMemo(() => {
    const visibleRows: DeptTableRow[] = []
    function walk(nodes: DeptNode[], depth: number) {
      for (const node of nodes) {
        visibleRows.push({ node, depth })
        if ((node.children?.length ?? 0) > 0 && expanded.has(node.id)) {
          walk(node.children, depth + 1)
        }
      }
    }
    walk(data ?? [], 0)
    return visibleRows
  }, [data, expanded])

  const columns = useMemo<DataTableColumnDef<DeptTableRow>[]>(
    () => [
      {
        header: '部门名称',
        cell: ({ row }: { row: { original: DeptTableRow } }) => {
          const { node, depth } = row.original
          const hasChildren = (node.children?.length ?? 0) > 0
          const isOpen = expanded.has(node.id)
          return (
            <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className="mr-1 text-muted-foreground hover:text-foreground"
                >
                  {isOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : (
                <span className="mr-1 inline-block size-4" />
              )}
              <span className="font-medium">{node.name}</span>
            </div>
          )
        },
      },
      {
        header: '负责人',
        cell: ({ row }: { row: { original: DeptTableRow } }) =>
          row.original.node.leader || '—',
      },
      {
        header: '联系电话',
        cell: ({ row }: { row: { original: DeptTableRow } }) =>
          row.original.node.phone || '—',
      },
      {
        header: '排序',
        cell: ({ row }: { row: { original: DeptTableRow } }) =>
          row.original.node.sort,
      },
      {
        header: '状态',
        cell: ({ row }: { row: { original: DeptTableRow } }) => (
          <StatusBadge status={row.original.node.status} />
        ),
      },
      {
        header: '操作',
        className: 'text-right',
        meta: { cellClassName: 'text-right' },
        cell: ({ row }: { row: { original: DeptTableRow } }) => {
          const { node } = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="新增子部门"
                onClick={() => setDialog({ open: true, parentId: node.id })}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="编辑"
                onClick={() => setDialog({ open: true, editing: node })}
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDialog
                description={`确定删除部门「${node.name}」吗？`}
                onConfirm={() => removeMutation.mutateAsync(node.id)}
                trigger={
                  <Button variant="ghost" size="icon" title="删除">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
            </div>
          )
        },
      },
    ],
    [expanded, removeMutation],
  )

  return (
    <ManagementPage title="组织架构控制台" description="维护部门层级、负责人和组织状态。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>部门管理</CardTitle>
        <Button onClick={() => setDialog({ open: true })}>
          <Plus className="mr-1 size-4" />
          新增部门
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          empty={(data?.length ?? 0) === 0 && !isLoading}
        />
      </CardContent>
      {dialog.open && (
        <DeptDialog
          editing={dialog.editing}
          parentId={dialog.parentId}
          options={options}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ open: false })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </Card>
    </ManagementPage>
  )
}
