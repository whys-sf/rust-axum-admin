import { createFileRoute } from '@tanstack/react-router'
import { DeptsPage } from '@/features/depts/depts-page'

export const Route = createFileRoute('/_app/depts')({
  component: DeptsPage,
})
