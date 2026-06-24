import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/common/data-table'
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
  const columns: DataTableColumnDef<Tenant>[] = [
    {
      accessorKey: 'name',
      header: '租户名称',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'code',
      header: '编码',
      meta: { cellClassName: 'text-muted-foreground' },
    },
    {
      accessorKey: 'contact_name',
      header: '联系人',
      cell: ({ row }) => row.original.contact_name || '—',
    },
    {
      accessorKey: 'user_limit',
      header: '用户上限',
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Switch
          checked={row.original.status === 1}
          onCheckedChange={(c) =>
            statusMutation.mutate({
              id: row.original.id,
              status: c ? 1 : 0,
            })
          }
        />
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => {
        const tenant = row.original
        return (
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
        )
      },
    },
  ]

  return (
    <ManagementPage title="租户运营控制台" description="管理租户生命周期、配额和服务状态。">
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
        <DataTable
          columns={columns}
          data={list}
          loading={tenantsQuery.isLoading}
          error={tenantsQuery.isError}
          onRetry={() => void tenantsQuery.refetch()}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: tenantsQuery.data?.total ?? 0,
            onChange: setPage,
          }}
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
    </ManagementPage>
  )
}
