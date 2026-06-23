import { createFileRoute } from '@tanstack/react-router'
import { DictItemsPage } from '@/features/dict/dict-items-page'

export const Route = createFileRoute('/_app/dict/items')({
  validateSearch: (search: Record<string, unknown>) => ({
    typeId: (search.typeId as string) ?? '',
    typeName: (search.typeName as string) ?? '',
    isTree: Number(search.isTree ?? 0),
    code: (search.code as string) ?? '',
  }),
  component: DictItemsPage,
})
