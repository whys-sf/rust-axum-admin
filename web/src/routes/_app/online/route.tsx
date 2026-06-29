import { createFileRoute } from '@tanstack/react-router'
import { OnlinePage } from '@/features/monitor/online-page'

export const Route = createFileRoute('/_app/online')({
  component: OnlinePage,
})
