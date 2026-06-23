import { createFileRoute } from '@tanstack/react-router'
import { ParamsPage } from '@/features/params/params-page'

export const Route = createFileRoute('/_app/params')({
  component: ParamsPage,
})
