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

interface ResetPasswordDialogProps {
  username: string
  saving: boolean
  onCancel: () => void
  onSubmit: (password: string) => void
}

export function ResetPasswordDialog({
  username,
  saving,
  onCancel,
  onSubmit,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>
            为用户「{username}」设置新密码（至少 6 位）。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>新密码</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={() => onSubmit(password)}
            disabled={saving || password.length < 6}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
