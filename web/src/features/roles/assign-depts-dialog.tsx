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
import type { DeptNode } from '@/lib/api/types'

interface AssignDeptsDialogProps {
  roleName: string
  depts: DeptNode[]
  selected: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (deptIds: string[]) => void
}

export function AssignDeptsDialog({
  roleName,
  depts,
  selected,
  saving,
  onCancel,
  onSubmit,
}: AssignDeptsDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selected.map(String)),
  )

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
          <DialogTitle>分配数据范围</DialogTitle>
          <DialogDescription>
            为角色「{roleName}」勾选可见的自定义部门。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-md border p-2">
          <TreeCheckbox nodes={depts} checked={checked} onToggle={toggle} />
          {depts.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无部门</p>
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
