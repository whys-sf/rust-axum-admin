import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
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
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  const mutation = useMutation({
    mutationFn: (values: { old_password: string; new_password: string }) =>
      authApi.changePassword(values),
    onSuccess: () => {
      toast.success('密码已修改，请重新登录')
      clear()
      navigate({ to: '/login' })
    },
  })

  const form = useForm({
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    onSubmit: ({ value }) => {
      if (value.new_password.length < 6) {
        toast.error('新密码至少 6 位')
        return
      }
      if (value.new_password !== value.confirm_password) {
        toast.error('两次输入的新密码不一致')
        return
      }
      mutation.mutate({
        old_password: value.old_password,
        new_password: value.new_password,
      })
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
          <CardDescription>当前登录账号信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="用户名" value={user?.username} />
          <InfoRow label="昵称" value={user?.nickname || '—'} />
          <InfoRow label="所属租户" value={user?.tenant_name} />
          <InfoRow label="角色" value={(user?.roles ?? []).join('、') || '—'} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>修改后需要重新登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>当前密码</Label>
              <form.Field name="old_password">
                {(field) => (
                  <Input
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </div>
            <div className="space-y-1.5">
              <Label>新密码</Label>
              <form.Field name="new_password">
                {(field) => (
                  <Input
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </div>
            <div className="space-y-1.5">
              <Label>确认新密码</Label>
              <form.Field name="confirm_password">
                {(field) => (
                  <Input
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              保存修改
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  )
}
