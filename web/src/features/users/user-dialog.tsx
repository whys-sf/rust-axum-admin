import { useState } from 'react'
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

  function submit() {
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

  const valid = editing
    ? true
    : form.username.trim().length >= 3 && form.password.length >= 6

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>填写用户信息后保存。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>用户名</Label>
              <Input
                value={form.username}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>初始密码</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>昵称</Label>
              <Input
                value={form.nickname ?? ''}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>部门</Label>
              <Select
                value={form.dept_id ?? '0'}
                onValueChange={(v) => setForm({ ...form, dept_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未分配" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">未分配</SelectItem>
                  {deptOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {'\u00A0'.repeat(o.depth * 2)}
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>邮箱</Label>
              <Input
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>手机号</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Input
              value={form.remark ?? ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>启用</Label>
            <Switch
              checked={form.status === 1}
              onCheckedChange={(c) => setForm({ ...form, status: c ? 1 : 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving || !valid}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
