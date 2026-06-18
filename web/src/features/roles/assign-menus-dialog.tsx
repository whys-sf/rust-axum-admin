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
import { TreeCheckbox } from '@/components/common/tree-checkbox'
import type { MenuNode } from '@/lib/api/types'

interface AssignMenusDialogProps {
  roleName: string
  menus: MenuNode[]
  selected: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (menuIds: string[]) => void
}

export function AssignMenusDialog({
  roleName,
  menus,
  selected,
  saving,
  onCancel,
  onSubmit,
}: AssignMenusDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(selected))

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配菜单权限</DialogTitle>
          <DialogDescription>
            为角色「{roleName}」勾选可访问的菜单与按钮。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-md border p-2">
          <TreeCheckbox nodes={menus} checked={checked} onToggle={toggle} />
          {menus.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无菜单</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={() => onSubmit([...checked])} disabled={saving}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
