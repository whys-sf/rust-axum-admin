import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: number }) {
  return status === 1 ? (
    <Badge variant="default">启用</Badge>
  ) : (
    <Badge variant="secondary">停用</Badge>
  )
}
