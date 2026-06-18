import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/features/auth/login-page'
import { isAuthenticated } from '@/stores/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})
