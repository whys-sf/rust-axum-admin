import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PagePaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function PagePagination({
  page,
  pageSize,
  total,
  onChange,
}: PagePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
      <span>
        共 {total} 条，第 {page} / {totalPages} 页
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          下一页
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
