import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/layout/app-layout'
import { isAuthenticated } from '@/stores/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})
