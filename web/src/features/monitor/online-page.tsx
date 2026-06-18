import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, RefreshCw } from 'lucide-react'
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
import { PERM, usePermission } from '@/lib/permissions'
import { monitorApi } from '@/lib/api/monitor'

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

  return (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>租户</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>登录时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  暂无在线用户
                </TableCell>
              </TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.token}>
                  <TableCell className="font-medium">
                    {item.username}
                    {item.is_platform && (
                      <Badge variant="secondary" className="ml-2">
                        平台
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.tenant_id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.ip ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(item.login_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canKick && (
                      <ConfirmDialog
                        description={`确定强制下线用户「${item.username}」吗？该会话的令牌将立即失效。`}
                        onConfirm={() => kickMutation.mutateAsync(item.token)}
                        trigger={
                          <Button variant="ghost" size="icon" title="强制下线">
                            <LogOut className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
