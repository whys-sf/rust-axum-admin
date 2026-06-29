import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
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
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={Mail}
          eyebrow={item ? (item.msg_type === 1 ? '系统通知' : '站内消息') : '加载中'}
          title={item?.title ?? '消息详情'}
          description={
            item
              ? `${item.sender_name ?? '系统'} · ${new Date(item.created_at).toLocaleString()}`
              : '加载中...'
          }
        />
        <div className="whitespace-pre-wrap px-5 py-7 text-sm leading-relaxed sm:px-7">
          {item?.content || '（无正文）'}
        </div>
      </DialogContent>
    </Dialog>
  )
}
