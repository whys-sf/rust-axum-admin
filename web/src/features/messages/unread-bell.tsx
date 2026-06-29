import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  CircleSmall,
  LoaderCircle,
  Mail,
  MailOpen,
  MessageSquare,
} from 'lucide-react'
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { messageApi } from "@/lib/api/message";
import type { InboxItem } from "@/lib/api/types";

/* ─── Main component ────────────────────────────────────────────── */

export function UnreadBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<string | null>(null);

  const countQuery = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => messageApi.unreadCount(),
    refetchInterval: 30000,
  });

  const inboxQuery = useQuery({
    queryKey: ["inbox", "popover"],
    queryFn: () => messageApi.inbox({ page: 1, page_size: 20 }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => messageApi.markAllRead(),
    onSuccess: () => {
      toast.success("已全部标记为已读");
      invalidate();
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["inbox"] });
    qc.invalidateQueries({ queryKey: ["unread-count"] });
  }

  const count = countQuery.data?.count ?? 0;
  const list = inboxQuery.data?.list ?? [];

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title="消息中心"
          >
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-96 p-0 overflow-hidden rounded-xl border-0 shadow-2xl ring-1 ring-black/8 dark:ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span className="text-sm font-semibold">消息</span>
              {count > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
                  {count} 未读
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                  className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                >
                  <CheckCheck className="size-3.5" />
                  全部已读
                </Button>
              )}
            </div>
          </div>
          <Separator />

          {/* List */}
          <ScrollArea className="h-80">
            {inboxQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <MailOpen className="size-8 opacity-40" />
                <p className="text-xs">暂无消息</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {list.map((msg, i) => (
                  <MessageRow
                    key={msg.message_id}
                    item={msg}
                    isLast={i === list.length - 1}
                    onClick={() => setViewing(msg.message_id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />
          {/* Footer */}
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate({ to: "/messages" })}
            >
              查看全部消息
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Message detail dialog */}
      {viewing && (
        <MessageDetailDialog
          messageId={viewing}
          onClose={() => setViewing(null)}
          onRead={invalidate}
        />
      )}
    </>
  );
}

/* ─── Message row in popover list ───────────────────────────────── */

function MessageRow({
  item,
  isLast,
  onClick,
}: {
  item: InboxItem;
  isLast: boolean;
  onClick: () => void;
}) {
  const timeStr = formatRelative(item.created_at);
  const typeLabel = item.msg_type === 1 ? "系统" : "站内";

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${!isLast ? "" : ""}`}
    >
      {/* Unread dot / read icon */}
      <div className="mt-1 flex shrink-0">
        {item.is_read ? (
          <MailOpen className="size-4 text-muted-foreground/60" />
        ) : (
          <div className="relative">
            <Mail className="size-4 text-primary" />
            <CircleSmall className="absolute -right-1.5 -top-1 size-2.5 fill-primary text-primary" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-xs ${item.is_read ? "text-muted-foreground" : "font-semibold text-foreground"}`}
          >
            {item.title}
          </span>
          <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium text-muted-foreground ring-1 ring-foreground/8">
            {typeLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>{item.sender_name ?? "系统"}</span>
          <span>·</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── Message detail dialog (close-only) ────────────────────────── */

function MessageDetailDialog({
  messageId,
  onClose,
  onRead,
}: {
  messageId: string;
  onClose: () => void;
  onRead: () => void;
}) {
  const query = useQuery({
    queryKey: ["inbox", "view", messageId],
    queryFn: () => messageApi.view(messageId),
  });

  // Mark as read once fetched
  const [marked, setMarked] = useState(false);
  if (query.isSuccess && !marked) {
    setMarked(true);
    onRead();
  }

  const item = query.data;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={true}
        className="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={Mail}
          eyebrow={
            item ? (item.msg_type === 1 ? "系统通知" : "站内消息") : "加载中"
          }
          title={item?.title ?? "消息详情"}
          description={
            item
              ? `${item.sender_name ?? "系统"} · ${new Date(item.created_at).toLocaleString()}`
              : "加载中..."
          }
        />

        <ScrollArea className="max-h-[50vh]">
          <div className="px-5 py-5 sm:px-6 sm:py-5">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {item?.content || "（无正文）"}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end border-t px-5 py-3 sm:px-6">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString();
}
