import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Database,
  LoaderCircle,
  ShieldCheck,
  TableProperties,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={ShieldCheck}
          eyebrow="数据导入"
          title="导入数据库表"
          description="选择未导入的数据表，生成对应的代码生成配置。"
          aside={(
            <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <Database className="size-5 text-primary" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  已选择
                </p>
                <p className="mt-0.5 text-xs font-bold text-foreground">
                  {selected.size} 张表
                </p>
              </div>
            </div>
          )}
        />

        <ScrollArea className="max-h-[55vh]">
          <div className="px-5 pt-7 sm:px-7">
            <div className="space-y-4 pb-7">
              <div className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-semibold">数据表清单</h3>
                  <p className="text-xs text-muted-foreground">选择需要生成代码的数据源</p>
                </div>
              </div>
              <div className="space-y-1">
                {query.isLoading ? (
                  <p className="text-sm text-muted-foreground">加载中...</p>
                ) : (
                  tables.map((t) => (
                    <label
                      key={t.table_name}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selected.has(t.table_name)}
                        disabled={t.imported}
                        onCheckedChange={() => toggle(t.table_name)}
                      />
                      <TableProperties className="size-3.5 text-primary" />
                      <span className="font-mono text-sm">{t.table_name}</span>
                      {t.comment && (
                        <span className="truncate text-xs text-muted-foreground">
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
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={importing}>
              取消
            </Button>
            <Button
              disabled={importing || selected.size === 0}
              onClick={() => onImport([...selected])}
              className="min-w-24"
            >
              {importing ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  导入中
                </>
              ) : (
                <>
                  <ShieldCheck />
                  导入（{selected.size}）
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
