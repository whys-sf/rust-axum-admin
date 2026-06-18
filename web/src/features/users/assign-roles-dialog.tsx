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
import { Checkbox } from '@/components/ui/checkbox'
import type { Role } from '@/lib/api/types'

interface AssignRolesDialogProps {
  username: string
  roles: Role[]
  selected: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (roleIds: string[]) => void
}

export function AssignRolesDialog({
  username,
  roles,
  selected,
  saving,
  onCancel,
  onSubmit,
}: AssignRolesDialogProps) {
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
          <DialogTitle>分配角色</DialogTitle>
          <DialogDescription>为用户「{username}」分配角色。</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent"
            >
              <Checkbox
                checked={checked.has(role.id)}
                onCheckedChange={() => toggle(role.id)}
              />
              <div>
                <div className="text-sm font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">{role.code}</div>
              </div>
            </label>
          ))}
          {roles.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无可分配的角色</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={() => onSubmit([...checked])}
            disabled={saving}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
