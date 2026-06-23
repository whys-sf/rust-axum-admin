import { createFileRoute } from '@tanstack/react-router'
import { TenantsPage } from '@/features/tenants/tenants-page'

export const Route = createFileRoute('/_app/tenants')({
  component: TenantsPage,
})
