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
import type { CreateDictItemPayload } from '@/lib/api/dict'
import type { DictItem } from '@/lib/api/types'

export interface ItemOption {
  id: string
  label: string
  depth: number
}

const LIST_CLASSES = [
  { value: 'default', label: '默认' },
  { value: 'success', label: '成功（绿）' },
  { value: 'warning', label: '警告（黄）' },
  { value: 'danger', label: '危险（红）' },
  { value: 'info', label: '信息（蓝）' },
] as const

const NONE = '__none__'

interface DictItemDialogProps {
  dictCode: string
  isTree: boolean
  parentOptions: ItemOption[]
  editing?: DictItem
  parentId?: string
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateDictItemPayload) => void
}

export function DictItemDialog({
  dictCode,
  isTree,
  parentOptions,
  editing,
  parentId,
  saving,
  onCancel,
  onSubmit,
}: DictItemDialogProps) {
  const [form, setForm] = useState<CreateDictItemPayload>({
    dict_code: dictCode,
    parent_id: editing?.parent_id ?? parentId ?? '0',
    label: editing?.label ?? '',
    value: editing?.value ?? '',
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
    list_class: editing?.list_class ?? null,
    remark: editing?.remark ?? '',
  })

  function submit() {
    onSubmit(editing?.id, {
      ...form,
      list_class:
        form.list_class && form.list_class !== 'default'
          ? form.list_class
          : null,
      remark: form.remark?.trim() || null,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑字典项' : '新增字典项'}</DialogTitle>
          <DialogDescription>字典「{dictCode}」</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isTree && (
            <div className="space-y-1.5">
              <Label>上级字典项</Label>
              <Select
                value={form.parent_id}
                onValueChange={(v) => setForm({ ...form, parent_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="顶级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">顶级</SelectItem>
                  {parentOptions
                    .filter((o) => o.id !== editing?.id)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {'\u00A0'.repeat(o.depth * 2)}
                        {o.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>标签</Label>
              <Input
                value={form.label}
                placeholder="展示文本"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>键值</Label>
              <Input
                value={form.value}
                placeholder="存储值"
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>标签样式</Label>
              <Select
                value={form.list_class || NONE}
                onValueChange={(v) =>
                  setForm({ ...form, list_class: v === NONE ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="默认" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>默认</SelectItem>
                  {LIST_CLASSES.filter((c) => c.value !== 'default').map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button
            onClick={submit}
            disabled={saving || !form.label.trim() || !form.value.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
