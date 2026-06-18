import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListTree, Menu as MenuIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import {
  roleApi,
  type CreateRolePayload,
  type UpdateRolePayload,
} from '@/lib/api/role'
import { menuApi } from '@/lib/api/menu'
import { deptApi } from '@/lib/api/dept'
import { DATA_SCOPE_CUSTOM, dataScopeLabel } from '@/lib/constants'
import type { Role } from '@/lib/api/types'
import { RoleDialog } from '@/features/roles/role-dialog'
import { AssignMenusDialog } from '@/features/roles/assign-menus-dialog'
import { AssignDeptsDialog } from '@/features/roles/assign-depts-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; role: Role }
  | { kind: 'menus'; role: Role }
  | { kind: 'depts'; role: Role }

export function RolesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const rolesQuery = useQuery({
    queryKey: ['roles', { page, name: search }],
    queryFn: () =>
      roleApi.list({ page, page_size: PAGE_SIZE, name: search || undefined }),
  })
  const menusQuery = useQuery({
    queryKey: ['menus'],
    queryFn: menuApi.list,
    enabled: dialog.kind === 'menus',
  })
  const deptsQuery = useQuery({
    queryKey: ['depts'],
    queryFn: deptApi.list,
    enabled: dialog.kind === 'depts',
  })
  const menuIdsQuery = useQuery({
    queryKey: ['role-menus', dialog.kind === 'menus' ? dialog.role.id : null],
    queryFn: () => roleApi.menuIds((dialog as { role: Role }).role.id),
    enabled: dialog.kind === 'menus',
  })
  const deptIdsQuery = useQuery({
    queryKey: ['role-depts', dialog.kind === 'depts' ? dialog.role.id : null],
    queryFn: () => roleApi.deptIds((dialog as { role: Role }).role.id),
    enabled: dialog.kind === 'depts',
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['roles'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => roleApi.create(payload),
    onSuccess: () => {
      toast.success('已创建')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: UpdateRolePayload }) =>
      roleApi.update(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => roleApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: number }) =>
      roleApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      toast.success('状态已更新')
      invalidate()
    },
  })
  const menusMutation = useMutation({
    mutationFn: (vars: { id: string; menuIds: string[] }) =>
      roleApi.assignMenus(vars.id, vars.menuIds),
    onSuccess: () => {
      toast.success('菜单权限已更新')
      setDialog({ kind: 'none' })
    },
  })
  const deptsMutation = useMutation({
    mutationFn: (vars: { id: string; deptIds: string[] }) =>
      roleApi.assignDepts(vars.id, vars.deptIds),
    onSuccess: () => {
      toast.success('数据范围已更新')
      setDialog({ kind: 'none' })
    },
  })

  const list = rolesQuery.data?.list ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>角色管理</CardTitle>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <Plus className="mr-1 size-4" />
          新增角色
        </Button>
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
            placeholder="按角色名称搜索"
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
              <TableHead>角色名称</TableHead>
              <TableHead>编码</TableHead>
              <TableHead>数据范围</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rolesQuery.isLoading ? (
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
              list.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {dataScopeLabel(role.data_scope)}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.sort}</TableCell>
                  <TableCell>
                    <Switch
                      checked={role.status === 1}
                      onCheckedChange={(c) =>
                        statusMutation.mutate({
                          id: role.id,
                          status: c ? 1 : 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="编辑"
                        onClick={() => setDialog({ kind: 'edit', role })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="分配菜单"
                        onClick={() => setDialog({ kind: 'menus', role })}
                      >
                        <MenuIcon className="size-4" />
                      </Button>
                      {role.data_scope === DATA_SCOPE_CUSTOM && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="分配数据范围"
                          onClick={() => setDialog({ kind: 'depts', role })}
                        >
                          <ListTree className="size-4" />
                        </Button>
                      )}
                      <ConfirmDialog
                        description={`确定删除角色「${role.name}」吗？`}
                        onConfirm={() => removeMutation.mutateAsync(role.id)}
                        trigger={
                          <Button variant="ghost" size="icon" title="删除">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
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
          total={rolesQuery.data?.total ?? 0}
          onChange={setPage}
        />
      </CardContent>

      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <RoleDialog
          editing={dialog.kind === 'edit' ? dialog.role : undefined}
          saving={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onCreate={(payload) => createMutation.mutate(payload)}
          onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
        />
      )}
      {dialog.kind === 'menus' && menuIdsQuery.data && (
        <AssignMenusDialog
          roleName={dialog.role.name}
          menus={menusQuery.data ?? []}
          selected={menuIdsQuery.data}
          saving={menusMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(menuIds) =>
            menusMutation.mutate({ id: dialog.role.id, menuIds })
          }
        />
      )}
      {dialog.kind === 'depts' && deptIdsQuery.data && (
        <AssignDeptsDialog
          roleName={dialog.role.name}
          depts={deptsQuery.data ?? []}
          selected={deptIdsQuery.data}
          saving={deptsMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(deptIds) =>
            deptsMutation.mutate({ id: dialog.role.id, deptIds })
          }
        />
      )}
    </Card>
  )
}
