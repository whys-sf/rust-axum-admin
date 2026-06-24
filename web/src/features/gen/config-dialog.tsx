import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Code2, LoaderCircle, Package, ShieldCheck, TableProperties } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/common/data-table'
import { genApi, type UpdateColumnPayload } from '@/lib/api/gen'
import type { GenColumn } from '@/lib/api/types'

interface ConfigDialogProps {
  tableId: string
  onClose: () => void
}

interface FieldProps {
  icon: typeof Code2
  label: string
  htmlFor: string
  children: ReactNode
}

function Field({ icon: Icon, label, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80"
      >
        <Icon className="size-3.5 text-primary" />
        <span>{label}</span>
      </Label>
      {children}
    </div>
  )
}

export function ConfigDialog({ tableId, onClose }: ConfigDialogProps) {
  const qc = useQueryClient()
  const [className, setClassName] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [functionName, setFunctionName] = useState('')
  const [columns, setColumns] = useState<GenColumn[]>([])

  useQuery({
    queryKey: ['gen-detail', tableId],
    queryFn: async () => {
      const detail = await genApi.detail(tableId)
      setClassName(detail.table.class_name)
      setModuleName(detail.table.module_name)
      setFunctionName(detail.table.function_name)
      setColumns(detail.columns)
      return detail
    },
  })

  function patchColumn(id: string, patch: Partial<GenColumn>) {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  const tableColumns: DataTableColumnDef<GenColumn>[] = [
    {
      header: '列名',
      meta: { cellClassName: 'font-mono text-xs' },
      cell: ({ row }) => (
        <>
          {row.original.column_name}
          {row.original.is_pk && (
            <span className="ml-1 text-[10px] text-primary">PK</span>
          )}
        </>
      ),
    },
    {
      header: '类型',
      meta: { cellClassName: 'font-mono text-xs text-muted-foreground' },
      cell: ({ row }) => row.original.column_type,
    },
    {
      header: '备注',
      cell: ({ row }) => (
        <Input
          value={row.original.column_comment}
          className="h-8"
          onChange={(e) =>
            patchColumn(row.original.id, { column_comment: e.target.value })
          }
        />
      ),
    },
    {
      header: '列表',
      className: 'text-center',
      meta: { cellClassName: 'text-center' },
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.is_list}
          onCheckedChange={(v) =>
            patchColumn(row.original.id, { is_list: Boolean(v) })
          }
        />
      ),
    },
    {
      header: '新增',
      className: 'text-center',
      meta: { cellClassName: 'text-center' },
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.is_insert}
          onCheckedChange={(v) =>
            patchColumn(row.original.id, { is_insert: Boolean(v) })
          }
        />
      ),
    },
    {
      header: '编辑',
      className: 'text-center',
      meta: { cellClassName: 'text-center' },
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.is_edit}
          onCheckedChange={(v) =>
            patchColumn(row.original.id, { is_edit: Boolean(v) })
          }
        />
      ),
    },
    {
      header: '查询',
      className: 'text-center',
      meta: { cellClassName: 'text-center' },
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.is_query}
          onCheckedChange={(v) =>
            patchColumn(row.original.id, { is_query: Boolean(v) })
          }
        />
      ),
    },
  ]

  const saveMutation = useMutation({
    mutationFn: () => {
      const colPayload: UpdateColumnPayload[] = columns.map((c) => ({
        id: c.id,
        column_comment: c.column_comment,
        is_required: c.is_required,
        is_insert: c.is_insert,
        is_edit: c.is_edit,
        is_list: c.is_list,
        is_query: c.is_query,
        sort: c.sort,
      }))
      return genApi.update(tableId, {
        class_name: className,
        module_name: moduleName,
        function_name: functionName,
        columns: colPayload,
      })
    },
    onSuccess: () => {
      toast.success('配置已保存')
      qc.invalidateQueries({ queryKey: ['gen-tables'] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-4xl dark:ring-white/10"
      >
        <DialogHeader className="control-grid relative overflow-hidden bg-primary px-5 py-5 text-left text-primary-foreground sm:px-7 sm:py-6">
          <div className="absolute -top-14 -right-12 size-40 rounded-full border border-primary-foreground/10" />
          <div className="absolute -top-6 -right-2 size-24 rounded-full border border-primary-foreground/10" />
          <div className="relative flex items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-primary-foreground/80" />
                <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
                  生成配置
                </span>
              </div>
              <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                配置代码生成规则
              </DialogTitle>
              <DialogDescription className="mt-2 text-primary-foreground/75">
                配置生成类名、模块名、业务名称和字段显示规则。
              </DialogDescription>
            </div>
            <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <TableProperties className="size-5 text-primary" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  字段数
                </p>
                <p className="mt-0.5 text-xs font-bold text-foreground">
                  {columns.length} 列
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh]">
          <div className="px-5 pt-7 sm:px-7">
            <div className="space-y-7 pb-7">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    01
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">生成标识</h3>
                    <p className="text-xs text-muted-foreground">定义生成代码的类名、模块和业务名称</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field icon={Code2} label="类名 (PascalCase)" htmlFor="gen-class-name">
                    <Input
                      id="gen-class-name"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field icon={Package} label="模块名 (snake_case)" htmlFor="gen-module-name">
                    <Input
                      id="gen-module-name"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field icon={BadgeCheck} label="业务名称" htmlFor="gen-function-name">
                    <Input
                      id="gen-function-name"
                      value={functionName}
                      onChange={(e) => setFunctionName(e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4 border-t border-dashed pt-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    02
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">字段规则</h3>
                    <p className="text-xs text-muted-foreground">配置字段备注和表单/列表显示规则</p>
                  </div>
                </div>
                <div className="max-h-[45vh] overflow-auto">
                  <DataTable columns={tableColumns} data={columns} emptyTitle="暂无字段配置" />
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>
              取消
            </Button>
            <Button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="min-w-24"
            >
              {saveMutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <ShieldCheck />
                  保存配置
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
