import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { Button } from '@/components/ui/button'
import { TreeCheckbox } from '@/components/common/tree-checkbox'
import { toggleTreeSelection } from '@/lib/tree'
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
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selected.map(String)),
  )

  function toggle(id: string) {
    setChecked((prev) => toggleTreeSelection(menus, prev, id))
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={ShieldCheck}
          eyebrow="权限分配"
          title="分配菜单权限"
          description={<>为角色「{roleName}」勾选可访问的菜单与按钮。</>}
          aside={(
            <div className="relative shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                已选择
              </p>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                {checked.size} 项
              </p>
            </div>
          )}
        />
        <div className="mx-5 mt-7 max-h-80 overflow-y-auto rounded-lg border p-3 sm:mx-7">
          <TreeCheckbox
            nodes={menus}
            checked={checked}
            onToggle={toggle}
            linked
          />
          {menus.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无菜单</p>
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
