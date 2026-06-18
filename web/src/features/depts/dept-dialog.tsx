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
import type { CreateDeptPayload } from '@/lib/api/dept'
import type { FlatOption } from '@/lib/tree'
import type { DeptNode } from '@/lib/api/types'

interface DeptDialogProps {
  editing?: DeptNode
  parentId?: string
  options: FlatOption[]
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateDeptPayload) => void
}

export function DeptDialog({
  editing,
  parentId,
  options,
  saving,
  onCancel,
  onSubmit,
}: DeptDialogProps) {
  const [form, setForm] = useState<CreateDeptPayload>({
    parent_id: editing?.parent_id ?? parentId ?? '0',
    name: editing?.name ?? '',
    leader: editing?.leader ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
  })

  function submit() {
    onSubmit(editing?.id, {
      ...form,
      leader: form.leader?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑部门' : '新增部门'}</DialogTitle>
          <DialogDescription>填写部门信息后保存。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>上级部门</Label>
            <Select
              value={form.parent_id}
              onValueChange={(v) => setForm({ ...form, parent_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="顶级部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">顶级部门</SelectItem>
                {options
                  .filter((o) => o.id !== editing?.id)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {'\u00A0'.repeat(o.depth * 2)}
                      {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>部门名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="部门名称"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>负责人</Label>
              <Input
                value={form.leader ?? ''}
                onChange={(e) => setForm({ ...form, leader: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>联系电话</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
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
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort ?? 0}
                onChange={(e) =>
                  setForm({ ...form, sort: Number(e.target.value) })
                }
              />
            </div>
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
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
