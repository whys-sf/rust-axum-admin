import { createFileRoute } from '@tanstack/react-router'
import { DictTypesPage } from '@/features/dict/dict-types-page'

export const Route = createFileRoute('/_app/dict/')({
  component: DictTypesPage,
})
