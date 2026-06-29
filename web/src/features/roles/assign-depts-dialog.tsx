import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
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
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={Building2}
          eyebrow="数据范围"
          title="分配数据范围"
          description={<>为角色「{roleName}」勾选可见的自定义部门。</>}
          aside={(
            <div className="relative shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                已选择
              </p>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                {checked.size} 个部门
              </p>
            </div>
          )}
        />
        <div className="mx-5 mt-7 max-h-80 overflow-y-auto rounded-lg border p-3 sm:mx-7">
          <TreeCheckbox nodes={depts} checked={checked} onToggle={toggle} />
          {depts.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无部门</p>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={onCancel}>
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
