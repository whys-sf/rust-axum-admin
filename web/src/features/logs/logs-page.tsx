import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DataTable, type DataTableColumnDef } from "@/components/common/data-table";
import { ManagementPage } from "@/components/common/management-page";
import { logApi } from "@/lib/api/log";
import type { OperationLog } from "@/lib/api/types";

const PAGE_SIZE = 15;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatBody(value?: string | null) {
  if (!value) return "未记录";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function isSuccess(status?: number | null) {
  return status !== null && status !== undefined && status < 400;
}

function methodVariant(method?: string | null) {
  if (method === "DELETE") return "destructive" as const;
  if (method === "POST") return "default" as const;
  return "outline" as const;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-sm">{value || "—"}</span>
    </div>
  );
}

function LogDetailDialog({
  log,
  onClose,
}: {
  log: OperationLog;
  onClose: () => void;
}) {
  const status = log.status_code ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={FileSearch}
          eyebrow="审计日志"
          title="审计记录详情"
          description={<>LOG-{log.id} · {formatDate(log.created_at)}</>}
          aside={(
            <Badge variant={isSuccess(status) ? "outline" : "destructive"}>
              {status ? String(status) : "—"}
            </Badge>
          )}
        />

        <div className="max-h-[calc(85vh-132px)] overflow-y-auto px-5 py-7 sm:px-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="操作用户" value={log.username || "匿名用户"} />
          <DetailField label="来源 IP" value={log.ip || "未记录"} />
          <DetailField label="请求方法" value={log.method || "—"} />
          <DetailField label="响应状态" value={status ? String(status) : "—"} />
          <DetailField label="执行耗时" value={`${log.duration_ms ?? 0} ms`} />
          <DetailField label="功能模块" value={log.module || "自动审计"} />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">请求路径</span>
          <code className="break-all rounded-lg bg-muted p-3 text-xs">
            {log.path || "—"}
          </code>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">请求内容</span>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs leading-5">
            {formatBody(log.request_body)}
          </pre>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">客户端信息</span>
          <p className="break-all rounded-lg bg-muted p-3 text-xs leading-5">
            {log.user_agent || "未记录"}
          </p>
        </div>

        {log.error_msg && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-destructive">错误信息</span>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-destructive/10 p-3 text-xs leading-5 text-destructive">
              {log.error_msg}
            </pre>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LogsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OperationLog | null>(null);

  const query = useQuery({
    queryKey: ["operation-logs", { page, username: search }],
    queryFn: () =>
      logApi.list({
        page,
        page_size: PAGE_SIZE,
        username: search || undefined,
      }),
  });

  const list = query.data?.list ?? [];
  const hasFilters = Boolean(search);

  const desktopColumns: DataTableColumnDef<OperationLog>[] = [
    {
      id: "request",
      header: "请求",
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div className="flex max-w-80 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant={methodVariant(log.method)}>
                {log.method || "—"}
              </Badge>
              <span className="truncate font-mono text-xs">
                {log.path || "—"}
              </span>
            </div>
            <span className="font-mono text-[0.65rem] tracking-wider text-muted-foreground">
              LOG-{log.id}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "username",
      header: "操作用户",
      className: "hidden sm:table-cell",
      meta: { cellClassName: "hidden sm:table-cell" },
      cell: ({ row }) => row.original.username || "匿名用户",
    },
    {
      accessorKey: "status_code",
      header: "状态",
      cell: ({ row }) => {
        const success = isSuccess(row.original.status_code);
        return (
          <Badge variant={success ? "default" : "destructive"}>
            {row.original.status_code ?? "—"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ip",
      header: "来源 IP",
      className: "hidden md:table-cell",
      meta: { cellClassName: "hidden font-mono text-xs text-muted-foreground md:table-cell" },
      cell: ({ row }) => row.original.ip || "—",
    },
    {
      accessorKey: "duration_ms",
      header: "耗时",
      className: "hidden lg:table-cell",
      meta: { cellClassName: "hidden font-mono text-xs lg:table-cell" },
      cell: ({ row }) => `${row.original.duration_ms ?? 0} ms`,
    },
    {
      accessorKey: "created_at",
      header: "发生时间",
      className: "hidden xl:table-cell",
      meta: { cellClassName: "hidden text-xs text-muted-foreground xl:table-cell" },
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "详情",
      className: "text-right",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`查看日志 ${row.original.id}`}
          title="查看详情"
          onClick={() => setSelected(row.original)}
        >
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <ManagementPage
      title="系统审计流"
      description="捕获关键写操作、访问异常与响应延迟，快速还原每一次系统变更。"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>操作日志</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(keyword.trim());
            }}
          >
            <Input
              aria-label="搜索操作用户"
              placeholder="按用户名搜索"
              value={keyword}
              className="max-w-xs"
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Search className="mr-1 size-4" />
              搜索
            </Button>
          </form>
          <DataTable
            columns={desktopColumns}
            data={list}
            loading={query.isLoading}
            error={query.isError}
            onRetry={() => void query.refetch()}
            emptyTitle="暂无审计记录"
            emptyDescription={
              hasFilters
                ? "没有匹配当前用户名的记录。"
                : "写操作发生后会显示在这里。"
            }
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total: query.data?.total ?? 0,
              onChange: setPage,
            }}
          />
        </CardContent>
      </Card>

      {selected && (
        <LogDetailDialog log={selected} onClose={() => setSelected(null)} />
      )}
    </ManagementPage>
  );
}
