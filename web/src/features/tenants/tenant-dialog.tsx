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
import type {
  CreateTenantPayload,
  UpdateTenantPayload,
} from '@/lib/api/tenant'
import type { Tenant } from '@/lib/api/types'

interface TenantDialogProps {
  editing?: Tenant
  saving: boolean
  onCancel: () => void
  onCreate: (payload: CreateTenantPayload) => void
  onUpdate: (id: string, payload: UpdateTenantPayload) => void
}

export function TenantDialog({
  editing,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: TenantDialogProps) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    contact_name: editing?.contact_name ?? '',
    contact_phone: editing?.contact_phone ?? '',
    user_limit: editing?.user_limit ?? 10,
    remark: editing?.remark ?? '',
    admin_username: '',
    admin_password: '',
  })

  function submit() {
    if (editing) {
      onUpdate(editing.id, {
        name: form.name,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        user_limit: form.user_limit,
        remark: form.remark || null,
      })
    } else {
      onCreate({
        name: form.name,
        code: form.code,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        user_limit: form.user_limit,
        admin_username: form.admin_username,
        admin_password: form.admin_password,
      })
    }
  }

  const valid = editing
    ? form.name.trim().length > 0
    : form.name.trim().length > 0 &&
      form.code.trim().length >= 2 &&
      form.admin_username.trim().length >= 3 &&
      form.admin_password.length >= 6

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑租户' : '新增租户'}</DialogTitle>
          <DialogDescription>
            {editing
              ? '修改租户基础信息。'
              : '创建租户的同时会初始化其管理员账号。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>租户名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>租户编码</Label>
              <Input
                value={form.code}
                disabled={!!editing}
                placeholder="如 acme"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>联系人</Label>
              <Input
                value={form.contact_name ?? ''}
                onChange={(e) =>
                  setForm({ ...form, contact_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>联系电话</Label>
              <Input
                value={form.contact_phone ?? ''}
                onChange={(e) =>
                  setForm({ ...form, contact_phone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>用户上限</Label>
            <Input
              type="number"
              value={form.user_limit}
              onChange={(e) =>
                setForm({ ...form, user_limit: Number(e.target.value) })
              }
            />
          </div>
          {!editing && (
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label>管理员账号</Label>
                <Input
                  value={form.admin_username}
                  onChange={(e) =>
                    setForm({ ...form, admin_username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>管理员密码</Label>
                <Input
                  type="password"
                  value={form.admin_password}
                  onChange={(e) =>
                    setForm({ ...form, admin_password: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          {editing && (
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input
                value={form.remark ?? ''}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>
          )}
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
