import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { messageApi } from '@/lib/api/message'

interface MessageViewDialogProps {
  messageId: string
  onClose: () => void
  onRead: () => void
}

export function MessageViewDialog({
  messageId,
  onClose,
  onRead,
}: MessageViewDialogProps) {
  // fetching the message marks it read server-side.
  const query = useQuery({
    queryKey: ['inbox', 'view', messageId],
    queryFn: () => messageApi.view(messageId),
  })

  useEffect(() => {
    if (query.isSuccess) onRead()
  }, [query.isSuccess, onRead])

  const item = query.data

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.title ?? '消息详情'}</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.sender_name ?? '系统'} · ${new Date(
                  item.created_at,
                ).toLocaleString()}`
              : '加载中...'}
          </DialogDescription>
        </DialogHeader>
        <div className="whitespace-pre-wrap text-sm">
          {item?.content || '（无正文）'}
        </div>
      </DialogContent>
    </Dialog>
  )
}
