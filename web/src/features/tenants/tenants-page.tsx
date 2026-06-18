import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
  tenantApi,
  type CreateTenantPayload,
  type UpdateTenantPayload,
} from '@/lib/api/tenant'
import type { Tenant } from '@/lib/api/types'
import { TenantDialog } from '@/features/tenants/tenant-dialog'

const PAGE_SIZE = 10

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; tenant: Tenant }

export function TenantsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const tenantsQuery = useQuery({
    queryKey: ['tenants', { page, name: search }],
    queryFn: () =>
      tenantApi.list({ page, page_size: PAGE_SIZE, name: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['tenants'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateTenantPayload) => tenantApi.create(payload),
    onSuccess: () => {
      toast.success('已创建')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: UpdateTenantPayload }) =>
      tenantApi.update(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => tenantApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: number }) =>
      tenantApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      toast.success('状态已更新')
      invalidate()
    },
  })

  const list = tenantsQuery.data?.list ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>租户管理</CardTitle>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <Plus className="mr-1 size-4" />
          新增租户
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
            placeholder="按租户名称搜索"
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
              <TableHead>租户名称</TableHead>
              <TableHead>编码</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>用户上限</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantsQuery.isLoading ? (
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
              list.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.code}
                  </TableCell>
                  <TableCell>{tenant.contact_name || '—'}</TableCell>
                  <TableCell>{tenant.user_limit}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tenant.status === 1}
                      onCheckedChange={(c) =>
                        statusMutation.mutate({
                          id: tenant.id,
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
                        onClick={() => setDialog({ kind: 'edit', tenant })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDialog
                        description={`确定删除租户「${tenant.name}」吗？该操作会移除其全部数据。`}
                        onConfirm={() => removeMutation.mutateAsync(tenant.id)}
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
          total={tenantsQuery.data?.total ?? 0}
          onChange={setPage}
        />
      </CardContent>

      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <TenantDialog
          editing={dialog.kind === 'edit' ? dialog.tenant : undefined}
          saving={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setDialog({ kind: 'none' })}
          onCreate={(payload) => createMutation.mutate(payload)}
          onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
        />
      )}
    </Card>
  )
}
