import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Code2, Files } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { Button } from '@/components/ui/button'
import { genApi } from '@/lib/api/gen'

interface PreviewDialogProps {
  tableId: string
  onClose: () => void
}

export function PreviewDialog({ tableId, onClose }: PreviewDialogProps) {
  const [active, setActive] = useState(0)
  const query = useQuery({
    queryKey: ['gen-preview', tableId],
    queryFn: () => genApi.preview(tableId),
  })

  const files = query.data ?? []
  const current = files[active]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[80vh] gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-5xl dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={Code2}
          eyebrow="代码生成"
          title="代码预览"
          description="预览当前表配置生成的文件内容。"
          aside={(
            <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <Files className="size-5 text-primary" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  文件数
                </p>
                <p className="mt-0.5 text-xs font-bold text-foreground">
                  {files.length} 个
                </p>
              </div>
            </div>
          )}
        />
        <div className="flex min-h-0 flex-1 gap-3 px-5 py-5 sm:px-7">
          <div className="w-64 shrink-0 space-y-1 overflow-auto border-r pr-2">
            {files.map((f, i) => (
              <button
                key={f.path}
                onClick={() => setActive(i)}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                  i === active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                title={f.path}
              >
                {f.path}
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-auto rounded bg-muted/40">
            {current ? (
              <pre className="p-3 text-xs">
                <code>{current.content}</code>
              </pre>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">
                {query.isLoading ? '生成中...' : '无内容'}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4 sm:px-7">
          {current && (
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(current.content)
              }}
            >
              复制当前文件
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
