import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Building2, KeyRound, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { authApi } from '@/lib/api/auth'
import { settingsApi } from '@/lib/api/settings'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  tenant_code: z.string().min(2, '请输入租户编码'),
  username: z.string().min(3, '请输入用户名'),
  password: z.string().min(6, '密码至少 6 位'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({
    tenant_code: 'demo',
    username: 'admin',
    password: 'Admin@123456',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: settingsApi.public,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await authApi.login(form)
      setTokens(resp.access_token, resp.refresh_token)
      const info = await authApi.userinfo()
      setUser(info)
      return info
    },
    onSuccess: (info) => {
      toast.success(`欢迎回来，${info.nickname || info.username}`)
      navigate({ to: '/' })
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    mutation.mutate()
  }

  const bg = settings?.login_background

  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-muted/40 bg-cover bg-center p-4"
      style={bg ? { backgroundImage: `url(${bg})` } : undefined}
    >
      {bg && <div className="absolute inset-0 bg-black/40" />}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <Card className="relative z-10 w-full max-w-sm">
        <CardHeader className="text-center">
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="logo"
              className="mx-auto mb-2 size-12 rounded-md object-cover"
            />
          )}
          <CardTitle className="text-2xl">
            {settings?.login_title || 'Rust Axum Admin'}
          </CardTitle>
          <CardDescription>
            {settings?.login_subtitle || '多租户管理后台'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              id="tenant_code"
              label="租户编码"
              icon={<Building2 className="size-4" />}
              value={form.tenant_code}
              placeholder="如 demo / platform"
              error={errors.tenant_code}
              onChange={(v) => setForm({ ...form, tenant_code: v })}
            />
            <Field
              id="username"
              label="用户名"
              icon={<User className="size-4" />}
              value={form.username}
              placeholder="用户名"
              error={errors.username}
              onChange={(v) => setForm({ ...form, username: v })}
            />
            <Field
              id="password"
              label="密码"
              type="password"
              icon={<KeyRound className="size-4" />}
              value={form.password}
              placeholder="密码"
              error={errors.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              登录
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              演示账号：demo / admin / Admin@123456
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  type?: string
  icon?: React.ReactNode
  error?: string
  onChange: (v: string) => void
}

function Field({
  id,
  label,
  value,
  placeholder,
  type = 'text',
  icon,
  error,
  onChange,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          className={icon ? 'pl-9' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
