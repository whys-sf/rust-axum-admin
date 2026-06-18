import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Search, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  userApi,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/lib/api/user'
import { roleApi } from '@/lib/api/role'
import { deptApi } from '@/lib/api/dept'
import { flattenTree } from '@/lib/tree'
import type { User } from '@/lib/api/types'
import { UserDialog } from '@/features/users/user-dialog'
import { AssignRolesDialog } from '@/features/users/assign-roles-dialog'
import { ResetPasswordDialog } from '@/features/users/reset-password-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; user: User }
  | { kind: 'roles'; user: User }
  | { kind: 'reset'; user: User }

export function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const usersQuery = useQuery({
    queryKey: ['users', { page, username: search }],
    queryFn: () =>
      userApi.list({ page, page_size: PAGE_SIZE, username: search || undefined }),
  })
  const rolesQuery = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => roleApi.list({ page: 1, page_size: 200 }),
  })
  const deptsQuery = useQuery({ queryKey: ['depts'], queryFn: deptApi.list })

  const deptOptions = useMemo(
    () => flattenTree(deptsQuery.data ?? []),
    [deptsQuery.data],
  )
  const deptName = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of deptOptions) map.set(o.id, o.name)
    return map
  }, [deptOptions])

  const detailQuery = useQuery({
    queryKey: ['user-detail', dialog.kind === 'roles' ? dialog.user.id : null],
    queryFn: () =>
      userApi.detail((dialog as { user: User }).user.id),
    enabled: dialog.kind === 'roles',
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => userApi.create(payload),
    onSuccess: () => {
      toast.success('已创建')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: UpdateUserPayload }) =>
      userApi.update(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => userApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: number }) =>
      userApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      toast.success('状态已更新')
      invalidate()
    },
  })
  const rolesMutation = useMutation({
    mutationFn: (vars: { id: string; roleIds: string[] }) =>
      userApi.assignRoles(vars.id, vars.roleIds),
    onSuccess: () => {
      toast.success('角色已更新')
      setDialog({ kind: 'none' })
    },
  })
  const resetMutation = useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      userApi.resetPassword(vars.id, vars.password),
    onSuccess: () => {
      toast.success('密码已重置')
      setDialog({ kind: 'none' })
    },
  })

  const list = usersQuery.data?.list ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>用户管理</CardTitle>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <Plus className="mr-1 size-4" />
          新增用户
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
            placeholder="按用户名搜索"
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
              <TableHead>用户名</TableHead>
              <TableHead>昵称</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading ? (
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
              list.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.nickname || '—'}</TableCell>
                  <TableCell>
                    {user.dept_id ? deptName.get(user.dept_id) ?? '—' : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.status === 1}
                      onCheckedChange={(c) =>
                        statusMutation.mutate({
                          id: user.id,
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
                        onClick={() => setDialog({ kind: 'edit', user })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="分配角色"
                        onClick={() => setDialog({ kind: 'roles', user })}
                      >
                        <UserCog className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="重置密码"
                        onClick={() => setDialog({ kind: 'reset', user })}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <ConfirmDialog
                        description={`确定删除用户「${user.username}」吗？`}
                        onConfirm={() => removeMutation.mutateAsync(user.id)}
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
          total={usersQuery.data?.total ?? 0}
          onChange={setPage}
        />
      </CardContent>

      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <UserDialog
          editing={dialog.kind === 'edit' ? dialog.user : undefined}
          deptOptions={deptOptions}
          saving={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onCreate={(payload) => createMutation.mutate(payload)}
          onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
        />
      )}
      {dialog.kind === 'roles' && detailQuery.data && (
        <AssignRolesDialog
          username={dialog.user.username}
          roles={rolesQuery.data?.list ?? []}
          selected={detailQuery.data.role_ids ?? []}
          saving={rolesMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(roleIds) =>
            rolesMutation.mutate({ id: dialog.user.id, roleIds })
          }
        />
      )}
      {dialog.kind === 'reset' && (
        <ResetPasswordDialog
          username={dialog.user.username}
          saving={resetMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onSubmit={(password) =>
            resetMutation.mutate({ id: dialog.user.id, password })
          }
        />
      )}
    </Card>
  )
}
