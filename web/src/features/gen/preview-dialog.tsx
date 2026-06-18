import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
      <DialogContent className="flex h-[80vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>代码预览</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 gap-3">
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
        <div className="flex justify-end gap-2">
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
