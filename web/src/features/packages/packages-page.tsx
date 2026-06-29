import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import {
  packageApi,
  type CreatePackagePayload,
  type UpdatePackagePayload,
} from '@/lib/api/package'
import type { Package } from '@/lib/api/types'
import { PackageDialog } from '@/features/packages/package-dialog'

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; package: Package }

export function PackagesPage() {
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })

  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: packageApi.list,
  })
  const featuresQuery = useQuery({
    queryKey: ['features'],
    queryFn: packageApi.features,
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['packages'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreatePackagePayload) => packageApi.create(payload),
    onSuccess: () => {
      toast.success('已创建')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: UpdatePackagePayload }) =>
      packageApi.update(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('已保存')
      invalidate()
      setDialog({ kind: 'none' })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => packageApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const featureName = useMemo(() => {
    const map = new Map<string, string>()
    for (const feature of featuresQuery.data ?? []) {
      map.set(feature.code, feature.name)
    }
    return map
  }, [featuresQuery.data])

  const columns: DataTableColumnDef<Package>[] = [
    {
      accessorKey: 'name',
      header: '套餐名称',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
            {row.original.description || '—'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: '编码',
      meta: { cellClassName: 'font-mono text-muted-foreground' },
    },
    {
      accessorKey: 'default_user_limit',
      header: '默认用户上限',
    },
    {
      accessorKey: 'feature_codes',
      header: '功能',
      cell: ({ row }) => (
        <div className="flex max-w-xl flex-wrap gap-1.5">
          {row.original.feature_codes.slice(0, 6).map((code) => (
            <Badge key={code} variant="secondary" className="font-normal">
              {featureName.get(code) ?? code}
            </Badge>
          ))}
          {row.original.feature_codes.length > 6 && (
            <Badge variant="outline" className="font-normal">
              +{row.original.feature_codes.length - 6}
            </Badge>
          )}
          {row.original.feature_codes.length === 0 && (
            <span className="text-muted-foreground">未启用功能</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="编辑"
              onClick={() => setDialog({ kind: 'edit', package: item })}
            >
              <Pencil className="size-4" />
            </Button>
            <DeleteConfirmDialog
              title="删除套餐"
              description="已有租户绑定的套餐不能删除。"
              targetLabel="目标套餐"
              targetName={item.name}
              onConfirm={() => removeMutation.mutateAsync(item.id)}
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

  const features = featuresQuery.data ?? []

  return (
    <ManagementPage title="套餐与功能开关" description="配置 SaaS 套餐、默认配额和可用功能模块。">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>套餐管理</CardTitle>
          <Button
            onClick={() => setDialog({ kind: 'create' })}
            disabled={featuresQuery.isLoading}
          >
            <Plus className="mr-1 size-4" />
            新增套餐
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={packagesQuery.data ?? []}
            loading={packagesQuery.isLoading || featuresQuery.isLoading}
            error={packagesQuery.isError || featuresQuery.isError}
            onRetry={() => {
              void packagesQuery.refetch()
              void featuresQuery.refetch()
            }}
          />
        </CardContent>

        {(dialog.kind === 'create' || dialog.kind === 'edit') && (
          <PackageDialog
            editing={dialog.kind === 'edit' ? dialog.package : undefined}
            features={features}
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
