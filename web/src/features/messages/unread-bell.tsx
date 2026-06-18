import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { messageApi } from '@/lib/api/message'

export function UnreadBell() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => messageApi.unreadCount(),
    refetchInterval: 30000,
  })
  const count = query.data?.count ?? 0

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      title="消息中心"
      onClick={() => navigate({ to: '/messages' })}
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  )
}
