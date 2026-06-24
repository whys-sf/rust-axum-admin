import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { StatusBadge } from '@/components/common/status-badge'
import { ManagementPage } from '@/components/common/management-page'
import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/common/data-table'
import { menuApi, type CreateMenuPayload } from '@/lib/api/menu'
import { flattenTree } from '@/lib/tree'
import { MENU_TYPE } from '@/lib/constants'
import type { MenuNode } from '@/lib/api/types'
import { MenuDialog } from '@/features/menus/menu-dialog'

interface MenuTableRow {
  node: MenuNode
  depth: number
}

export function MenusPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<{
    open: boolean
    editing?: MenuNode
    parentId?: string
  }>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: menuApi.list,
  })

  const options = useMemo(() => flattenTree(data ?? [], undefined, undefined, (n) => n.type !== 3), [data])

  const removeMutation = useMutation({
    mutationFn: (id: string) => menuApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: string; payload: CreateMenuPayload }) =>
      vars.id
        ? menuApi.update(vars.id, vars.payload)
        : menuApi.create(vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      qc.invalidateQueries({ queryKey: ['menus'] })
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
    const visibleRows: MenuTableRow[] = []
    function walk(nodes: MenuNode[], depth: number) {
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

  const columns = useMemo<DataTableColumnDef<MenuTableRow>[]>(
    () => [
      {
        header: '菜单名称',
        cell: ({ row }) => {
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
        header: '类型',
        cell: ({ row }) => {
          const type = MENU_TYPE[row.original.node.type]
          return (
            <Badge variant={type?.variant ?? 'outline'}>
              {type?.label ?? row.original.node.type}
            </Badge>
          )
        },
      },
      {
        header: '路由路径',
        meta: { cellClassName: 'text-muted-foreground' },
        cell: ({ row }) => row.original.node.path || '—',
      },
      {
        header: '权限标识',
        meta: { cellClassName: 'text-muted-foreground' },
        cell: ({ row }) => row.original.node.perm || '—',
      },
      {
        header: '排序',
        cell: ({ row }) => row.original.node.sort,
      },
      {
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.node.status} />,
      },
      {
        header: '操作',
        className: 'text-right',
        meta: { cellClassName: 'text-right' },
        cell: ({ row }) => {
          const { node } = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="新增子菜单"
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
                description={`确定删除菜单「${node.name}」吗？`}
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
    <ManagementPage title="菜单路由控制台" description="编排导航结构、路由入口和权限标识。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>菜单管理</CardTitle>
        <Button onClick={() => setDialog({ open: true })}>
          <Plus className="mr-1 size-4" />
          新增菜单
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          empty={(data?.length ?? 0) === 0}
        />
      </CardContent>
      {dialog.open && (
        <MenuDialog
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
