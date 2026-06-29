import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import { monitorApi } from '@/lib/api/monitor'
import type { OnlineUser } from '@/lib/api/types'

export function OnlinePage() {
  const qc = useQueryClient()
  const canKick = usePermission(PERM.onlineKick)

  const query = useQuery({
    queryKey: ['online'],
    queryFn: monitorApi.online,
    refetchInterval: 10_000,
  })

  const kickMutation = useMutation({
    mutationFn: (token: string) => monitorApi.kick(token),
    onSuccess: () => {
      toast.success('已强制下线')
      qc.invalidateQueries({ queryKey: ['online'] })
    },
  })

  const list = query.data ?? []

  const columns: DataTableColumnDef<OnlineUser>[] = [
    {
      accessorKey: 'username',
      header: '用户名',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.username}
          {row.original.is_platform && (
            <Badge variant="secondary" className="ml-2">
              平台
            </Badge>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'tenant_id',
      header: '租户',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.tenant_id}</span>
      ),
    },
    {
      accessorKey: 'ip',
      header: 'IP',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'login_at',
      header: '登录时间',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.login_at).toLocaleString()}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      cell: ({ row }) => {
        const item = row.original
        return canKick ? (
          <ConfirmDialog
            description={`确定强制下线用户「${item.username}」吗？该会话的令牌将立即失效。`}
            onConfirm={() => kickMutation.mutateAsync(item.token)}
            trigger={
              <Button variant="ghost" size="icon" title="强制下线">
                <LogOut className="size-4 text-destructive" />
              </Button>
            }
          />
        ) : null
      },
    },
  ]

  return (
    <ManagementPage title="在线会话控制台" description="监测当前在线会话并处置异常访问。">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>在线用户</CardTitle>
        <Button
          variant="secondary"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className="mr-1 size-4" />
          刷新
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={list}
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => void query.refetch()}
          emptyTitle="暂无在线用户"
        />
      </CardContent>
    </Card>
    </ManagementPage>
  )
}
