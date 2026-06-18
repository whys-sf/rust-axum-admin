import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { genApi, type UpdateColumnPayload } from '@/lib/api/gen'
import type { GenColumn } from '@/lib/api/types'

interface ConfigDialogProps {
  tableId: string
  onClose: () => void
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>生成配置</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>类名 (PascalCase)</Label>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>模块名 (snake_case)</Label>
            <Input
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>业务名称</Label>
            <Input
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[45vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>列名</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-center">列表</TableHead>
                <TableHead className="text-center">新增</TableHead>
                <TableHead className="text-center">编辑</TableHead>
                <TableHead className="text-center">查询</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    {c.column_name}
                    {c.is_pk && (
                      <span className="ml-1 text-[10px] text-primary">PK</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.column_type}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={c.column_comment}
                      className="h-8"
                      onChange={(e) =>
                        patchColumn(c.id, { column_comment: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={c.is_list}
                      onCheckedChange={(v) =>
                        patchColumn(c.id, { is_list: Boolean(v) })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={c.is_insert}
                      onCheckedChange={(v) =>
                        patchColumn(c.id, { is_insert: Boolean(v) })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={c.is_edit}
                      onCheckedChange={(v) =>
                        patchColumn(c.id, { is_edit: Boolean(v) })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={c.is_query}
                      onCheckedChange={(v) =>
                        patchColumn(c.id, { is_query: Boolean(v) })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
