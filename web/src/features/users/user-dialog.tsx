import { useState } from 'react'
import {
  AtSign,
  BadgeCheck,
  Building2,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CreateUserPayload,
  UpdateUserPayload,
} from '@/lib/api/user'
import type { FlatOption } from '@/lib/tree'
import type { User } from '@/lib/api/types'

interface UserDialogProps {
  editing?: User
  deptOptions: FlatOption[]
  saving: boolean
  onCancel: () => void
  onCreate: (payload: CreateUserPayload) => void
  onUpdate: (id: string, payload: UpdateUserPayload) => void
}

interface FieldProps {
  icon: typeof UserRound
  label: string
  htmlFor: string
  optional?: boolean
  children: React.ReactNode
}

function Field({ icon: Icon, label, htmlFor, optional, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80"
        >
          <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          {label}
        </Label>
        {optional && (
          <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export function UserDialog({
  editing,
  deptOptions,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: UserDialogProps) {
  const [form, setForm] = useState({
    username: editing?.username ?? '',
    password: '',
    nickname: editing?.nickname ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    dept_id: editing?.dept_id ?? '0',
    status: editing?.status ?? 1,
    remark: editing?.remark ?? '',
  })

  function submit(event?: React.FormEvent) {
    event?.preventDefault()
    if (!valid || saving) return

    const dept_id = form.dept_id === '0' ? null : form.dept_id
    if (editing) {
      onUpdate(editing.id, {
        nickname: form.nickname || null,
        email: form.email || null,
        phone: form.phone || null,
        dept_id,
        status: form.status,
        remark: form.remark || null,
      })
    } else {
      onCreate({
        username: form.username,
        password: form.password,
        nickname: form.nickname || null,
        email: form.email || null,
        phone: form.phone || null,
        dept_id,
        status: form.status,
        remark: form.remark || null,
      })
    }
  }

  const usernameValid = form.username.trim().length >= 3
  const passwordValid = form.password.length >= 6
  const valid = editing ? true : usernameValid && passwordValid
  const deptName =
    deptOptions.find((option) => option.id === form.dept_id)?.name ?? '未分配部门'
  const displayName =
    form.nickname.trim() || form.username.trim() || (editing ? '用户档案' : '新成员')
  const avatarText = displayName.slice(0, 1).toUpperCase()

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-4xl md:overflow-hidden dark:ring-white/10"
      >
        <form onSubmit={submit} className="grid min-h-0 md:grid-cols-[17rem_1fr]">
          <aside className="control-grid relative overflow-hidden bg-emerald-700 p-6 text-white md:p-7">
            <div className="absolute -top-20 -right-20 size-52 rounded-full border border-white/10" />
            <div className="absolute -top-8 -right-8 size-28 rounded-full border border-white/10" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-emerald-100 uppercase">
                <ShieldCheck className="size-4" />
                Identity record
              </div>

              <div className="mt-7 flex items-center gap-4 md:mt-12 md:block">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15 text-2xl font-semibold shadow-lg shadow-emerald-950/15 backdrop-blur-sm md:size-20 md:text-3xl">
                  {avatarText}
                </div>
                <div className="min-w-0 md:mt-5">
                  <p className="truncate text-xl font-semibold tracking-tight md:text-2xl">
                    {displayName}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-emerald-100/80">
                    @{form.username.trim() || 'username'}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 md:mt-auto md:grid-cols-1">
                <div className="rounded-xl border border-white/15 bg-black/8 px-3.5 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[10px] tracking-wider text-emerald-100/70 uppercase">
                    <Building2 className="size-3.5" />
                    组织归属
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium">{deptName}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/8 px-3.5 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[10px] tracking-wider text-emerald-100/70 uppercase">
                    <BadgeCheck className="size-3.5" />
                    账号状态
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                    <span
                      className={`size-1.5 rounded-full ${
                        form.status === 1 ? 'bg-emerald-200' : 'bg-white/40'
                      }`}
                    />
                    {form.status === 1 ? '正常启用' : '暂停访问'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="overflow-y-auto px-5 pt-5 sm:px-7 sm:pt-7">
              <DialogHeader className="pr-8 text-left">
                <div className="flex items-center gap-2">
                  <span className="h-px w-5 bg-emerald-600" />
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-400">
                    {editing ? 'Record update' : 'New credential'}
                  </span>
                </div>
                <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {editing ? '编辑身份档案' : '登记组织成员'}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? '更新成员的组织信息与访问状态，用户名不可修改。'
                    : '创建登录凭证，并将成员加入正确的组织单元。'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-7 space-y-7 pb-7">
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      01
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">账号凭证</h3>
                      <p className="text-xs text-muted-foreground">用于识别和登录系统</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={AtSign} label="用户名" htmlFor="user-username">
                      <Input
                        id="user-username"
                        autoFocus={!editing}
                        autoComplete="username"
                        placeholder="至少 3 个字符"
                        value={form.username}
                        disabled={!!editing}
                        aria-invalid={!editing && form.username.length > 0 && !usernameValid}
                        onChange={(event) =>
                          setForm({ ...form, username: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                      {!editing && form.username.length > 0 && !usernameValid && (
                        <p className="mt-1.5 text-xs text-destructive">用户名至少需要 3 个字符</p>
                      )}
                    </Field>
                    {!editing && (
                      <Field icon={KeyRound} label="初始密码" htmlFor="user-password">
                        <Input
                          id="user-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="至少 6 个字符"
                          value={form.password}
                          aria-invalid={form.password.length > 0 && !passwordValid}
                          onChange={(event) =>
                            setForm({ ...form, password: event.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                        {form.password.length > 0 && !passwordValid && (
                          <p className="mt-1.5 text-xs text-destructive">密码至少需要 6 个字符</p>
                        )}
                      </Field>
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">组织资料</h3>
                      <p className="text-xs text-muted-foreground">成员名称与部门归属</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={UserRound} label="显示昵称" htmlFor="user-nickname" optional>
                      <Input
                        id="user-nickname"
                        placeholder="成员在系统中的称呼"
                        value={form.nickname ?? ''}
                        onChange={(event) =>
                          setForm({ ...form, nickname: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={Building2} label="所属部门" htmlFor="user-dept" optional>
                      <Select
                        value={form.dept_id ?? '0'}
                        onValueChange={(value) => setForm({ ...form, dept_id: value })}
                      >
                        <SelectTrigger id="user-dept" className="h-10 w-full bg-muted/25 px-3">
                          <SelectValue placeholder="未分配部门" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">未分配部门</SelectItem>
                          {deptOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {'\u00A0'.repeat(option.depth * 2)}
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      03
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">联系方式</h3>
                      <p className="text-xs text-muted-foreground">补充成员联络信息与备注</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Mail} label="邮箱地址" htmlFor="user-email" optional>
                      <Input
                        id="user-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={form.email ?? ''}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={Phone} label="手机号码" htmlFor="user-phone" optional>
                      <Input
                        id="user-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="请输入手机号码"
                        value={form.phone ?? ''}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                  </div>
                  <Field icon={BadgeCheck} label="档案备注" htmlFor="user-remark" optional>
                    <Textarea
                      id="user-remark"
                      rows={2}
                      placeholder="记录职责范围、入职信息或其他说明…"
                      value={form.remark ?? ''}
                      onChange={(event) => setForm({ ...form, remark: event.target.value })}
                      className="min-h-18 resize-none bg-muted/25 px-3"
                    />
                  </Field>
                </section>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-between rounded-none px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <Switch
                  id="user-status"
                  checked={form.status === 1}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, status: checked ? 1 : 0 })
                  }
                />
                <Label htmlFor="user-status" className="cursor-pointer">
                  <span className="block text-xs font-semibold">
                    {form.status === 1 ? '允许登录' : '暂停登录'}
                  </span>
                  <span className="hidden text-[10px] font-normal text-muted-foreground sm:block">
                    保存后立即生效
                  </span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !valid}
                  className="min-w-24 bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <ShieldCheck />
                      {editing ? '更新档案' : '创建档案'}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
