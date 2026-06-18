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
import type { CreateMenuPayload } from '@/lib/api/menu'
import type { FlatOption } from '@/lib/tree'
import type { MenuNode } from '@/lib/api/types'

interface MenuDialogProps {
  editing?: MenuNode
  parentId?: string
  options: FlatOption[]
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateMenuPayload) => void
}

export function MenuDialog({
  editing,
  parentId,
  options,
  saving,
  onCancel,
  onSubmit,
}: MenuDialogProps) {
  const [form, setForm] = useState<CreateMenuPayload>({
    parent_id: editing?.parent_id ?? parentId ?? '0',
    name: editing?.name ?? '',
    type: editing?.type ?? 2,
    path: editing?.path ?? '',
    component: editing?.component ?? '',
    perm: editing?.perm ?? '',
    api_path: editing?.api_path ?? '',
    api_method: editing?.api_method ?? '',
    icon: editing?.icon ?? '',
    sort: editing?.sort ?? 0,
    visible: editing?.visible ?? 1,
    status: editing?.status ?? 1,
  })

  const isButton = form.type === 3

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑菜单' : '新增菜单'}</DialogTitle>
          <DialogDescription>填写菜单信息后保存。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>上级菜单</Label>
              <Select
                value={form.parent_id}
                onValueChange={(v) => setForm({ ...form, parent_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="顶级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">顶级菜单</SelectItem>
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
              <Label>类型</Label>
              <Select
                value={String(form.type)}
                onValueChange={(v) => setForm({ ...form, type: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">目录</SelectItem>
                  <SelectItem value="2">菜单</SelectItem>
                  <SelectItem value="3">按钮</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>菜单名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {!isButton && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>路由路径</Label>
                <Input
                  value={form.path ?? ''}
                  placeholder="/system/user"
                  onChange={(e) => setForm({ ...form, path: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>组件路径</Label>
                <Input
                  value={form.component ?? ''}
                  placeholder="system/user/index"
                  onChange={(e) =>
                    setForm({ ...form, component: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>权限标识</Label>
              <Input
                value={form.perm ?? ''}
                placeholder="system:user:list"
                onChange={(e) => setForm({ ...form, perm: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>图标</Label>
              <Input
                value={form.icon ?? ''}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>接口路径</Label>
              <Input
                value={form.api_path ?? ''}
                placeholder="/api/v1/users"
                onChange={(e) => setForm({ ...form, api_path: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>接口方法</Label>
              <Input
                value={form.api_method ?? ''}
                placeholder="GET"
                onChange={(e) =>
                  setForm({ ...form, api_method: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center justify-between pt-6">
              <Label>启用</Label>
              <Switch
                checked={form.status === 1}
                onCheckedChange={(c) => setForm({ ...form, status: c ? 1 : 0 })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={() => onSubmit(editing?.id, form)}
            disabled={saving || !form.name.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
