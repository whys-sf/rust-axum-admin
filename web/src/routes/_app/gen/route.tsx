import { createFileRoute } from '@tanstack/react-router'
import { GenPage } from '@/features/gen/gen-page'

export const Route = createFileRoute('/_app/gen')({
  component: GenPage,
})
