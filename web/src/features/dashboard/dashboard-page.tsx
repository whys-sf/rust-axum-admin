import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Network,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { userApi } from '@/lib/api/user'
import { roleApi } from '@/lib/api/role'
import { deptApi } from '@/lib/api/dept'
import { useAuthStore } from '@/stores/auth'
import { PERM, usePermission } from '@/lib/permissions'
import type { DeptNode } from '@/lib/api/types'

function countDepts(nodes: DeptNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countDepts(n.children ?? []), 0)
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const canUsers = usePermission(PERM.userList)
  const canRoles = usePermission(PERM.roleList)
  const canDepts = usePermission(PERM.deptList)

  const users = useQuery({
    queryKey: ['users', { page: 1, page_size: 1 }],
    queryFn: () => userApi.list({ page: 1, page_size: 1 }),
    enabled: canUsers,
  })
  const roles = useQuery({
    queryKey: ['roles', { page: 1, page_size: 1 }],
    queryFn: () => roleApi.list({ page: 1, page_size: 1 }),
    enabled: canRoles,
  })
  const depts = useQuery({
    queryKey: ['depts'],
    queryFn: deptApi.list,
    enabled: canDepts,
  })

  const stats = [
    {
      label: '用户数',
      value: users.data?.total ?? '—',
      icon: Users,
    },
    {
      label: '角色数',
      value: roles.data?.total ?? '—',
      icon: ShieldCheck,
    },
    {
      label: '部门数',
      value: depts.data ? countDepts(depts.data) : '—',
      icon: Network,
    },
    {
      label: '当前租户',
      value: user?.tenant_name ?? '—',
      icon: Building2,
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>你好，{user?.nickname || user?.username} 👋</CardTitle>
          <CardDescription>
            欢迎使用 Rust Axum Admin 多租户管理后台。当前角色：
            {(user?.roles ?? []).join('、') || '—'}
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
