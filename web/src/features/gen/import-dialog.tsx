import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { genApi } from '@/lib/api/gen'

interface ImportDialogProps {
  importing: boolean
  onCancel: () => void
  onImport: (tables: string[]) => void
}

export function ImportDialog({
  importing,
  onCancel,
  onImport,
}: ImportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const query = useQuery({
    queryKey: ['gen-db-tables'],
    queryFn: () => genApi.dbTables(),
  })

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const tables = query.data ?? []

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入数据库表</DialogTitle>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-1 overflow-auto">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            tables.map((t) => (
              <label
                key={t.table_name}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(t.table_name)}
                  disabled={t.imported}
                  onCheckedChange={() => toggle(t.table_name)}
                />
                <span className="font-mono text-sm">{t.table_name}</span>
                {t.comment && (
                  <span className="text-xs text-muted-foreground">
                    {t.comment}
                  </span>
                )}
                {t.imported && (
                  <Badge variant="secondary" className="ml-auto">
                    已导入
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            disabled={importing || selected.size === 0}
            onClick={() => onImport([...selected])}
          >
            导入（{selected.size}）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
