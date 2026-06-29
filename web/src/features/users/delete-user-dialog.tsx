import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import type { User } from "@/lib/api/types";

interface DeleteUserDialogProps {
  user: User;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteUserDialog({
  user,
  saving,
  onCancel,
  onConfirm,
}: DeleteUserDialogProps) {
  return (
    <DeleteConfirmDialog
      open
      title="删除用户档案"
      targetLabel="目标用户"
      targetName={user.username}
      targetDescription={user.nickname ? <>昵称：{user.nickname}</> : undefined}
      saving={saving}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
