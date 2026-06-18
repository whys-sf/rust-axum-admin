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
import { DATA_SCOPE_OPTIONS } from '@/lib/constants'
import type {
  CreateRolePayload,
  UpdateRolePayload,
} from '@/lib/api/role'
import type { Role } from '@/lib/api/types'

interface RoleDialogProps {
  editing?: Role
  saving: boolean
  onCancel: () => void
  onCreate: (payload: CreateRolePayload) => void
  onUpdate: (id: string, payload: UpdateRolePayload) => void
}

export function RoleDialog({
  editing,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: RoleDialogProps) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
    data_scope: editing?.data_scope ?? 1,
    remark: editing?.remark ?? '',
  })

  function submit() {
    if (editing) {
      onUpdate(editing.id, {
        name: form.name,
        sort: form.sort,
        status: form.status,
        data_scope: form.data_scope,
        remark: form.remark || null,
      })
    } else {
      onCreate({
        name: form.name,
        code: form.code,
        sort: form.sort,
        status: form.status,
        data_scope: form.data_scope,
        remark: form.remark || null,
      })
    }
  }

  const valid = editing
    ? form.name.trim().length > 0
    : form.name.trim().length > 0 && form.code.trim().length > 0

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>填写角色信息后保存。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>角色名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>角色编码</Label>
              <Input
                value={form.code}
                disabled={!!editing}
                placeholder="如 admin"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>数据范围</Label>
              <Select
                value={String(form.data_scope)}
                onValueChange={(v) =>
                  setForm({ ...form, data_scope: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SCOPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort}
                onChange={(e) =>
                  setForm({ ...form, sort: Number(e.target.value) })
                }
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
