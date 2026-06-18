import { createFileRoute } from '@tanstack/react-router'
import { DictPage } from '@/features/dict/dict-page'

export const Route = createFileRoute('/_app/dict')({
  component: DictPage,
})
