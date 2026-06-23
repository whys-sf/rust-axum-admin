import { createFileRoute } from '@tanstack/react-router'
import { MenusPage } from '@/features/menus/menus-page'

export const Route = createFileRoute('/_app/menus')({
  component: MenusPage,
})
