import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { StatusBadge } from '@/components/common/status-badge'
import { menuApi, type CreateMenuPayload } from '@/lib/api/menu'
import { flattenTree } from '@/lib/tree'
import { MENU_TYPE } from '@/lib/constants'
import type { MenuNode } from '@/lib/api/types'
import { MenuDialog } from '@/features/menus/menu-dialog'

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

  const options = useMemo(() => flattenTree(data ?? []), [data])

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

  function renderRows(nodes: MenuNode[], depth: number): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0
      const isOpen = expanded.has(node.id)
      const type = MENU_TYPE[node.type]
      return (
        <Fragment key={node.id}>
          <TableRow>
            <TableCell>
              <div
                className="flex items-center"
                style={{ paddingLeft: depth * 20 }}
              >
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
            </TableCell>
            <TableCell>
              <Badge variant={type?.variant ?? 'outline'}>
                {type?.label ?? node.type}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {node.path || '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {node.perm || '—'}
            </TableCell>
            <TableCell>{node.sort}</TableCell>
            <TableCell>
              <StatusBadge status={node.status} />
            </TableCell>
            <TableCell className="text-right">
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
            </TableCell>
          </TableRow>
          {hasChildren && isOpen && renderRows(node.children, depth + 1)}
        </Fragment>
      )
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>菜单管理</CardTitle>
        <Button onClick={() => setDialog({ open: true })}>
          <Plus className="mr-1 size-4" />
          新增菜单
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>菜单名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>路由路径</TableHead>
              <TableHead>权限标识</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : (data?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              renderRows(data!, 0)
            )}
          </TableBody>
        </Table>
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
  )
}
