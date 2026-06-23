import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PagePagination } from "@/components/common/page-pagination";
import { logApi } from "@/lib/api/log";
import type { OperationLog } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>审计记录详情</DialogTitle>
          <DialogDescription>
            LOG-{log.id} · {formatDate(log.created_at)}
          </DialogDescription>
        </DialogHeader>

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
  const failedOnPage = list.filter(
    (log) => log.status_code !== null && (log.status_code ?? 0) >= 400,
  ).length;
  const durations = list
    .map((log) => log.duration_ms)
    .filter((value): value is number => value !== null && value !== undefined);
  const averageDuration = durations.length
    ? Math.round(
        durations.reduce((total, duration) => total + duration, 0) /
          durations.length,
      )
    : 0;

  const hasFilters = Boolean(search);

  function resetFilters() {
    setKeyword("");
    setSearch("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="control-grid relative overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute top-0 right-0 size-24 border-b border-l border-primary-foreground/15" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:p-8">
          <div className="flex max-w-xl flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                系统审计流
              </h1>
              <p className="text-sm leading-6 text-primary-foreground/70">
                捕获关键写操作、访问异常与响应延迟，快速还原每一次系统变更。
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-xs lg:max-w-xl">
            <div className="flex min-w-0 flex-col gap-2 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-primary-foreground/55">
                <ShieldCheck className="size-4" />
                <span className="truncate font-mono text-[0.65rem] tracking-widest">
                  事件
                </span>
              </div>
              <strong className="font-mono text-2xl font-medium tabular-nums sm:text-3xl">
                {String(query.data?.total ?? 0).padStart(2, "0")}
              </strong>
              <span className="truncate text-xs text-primary-foreground/65">
                审计事件
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 border-l border-primary-foreground/15 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-primary-foreground/55">
                <TriangleAlert className="size-4" />
                <span className="truncate font-mono text-[0.65rem] tracking-widest">
                  异常
                </span>
              </div>
              <strong className="font-mono text-2xl font-medium tabular-nums sm:text-3xl">
                {String(failedOnPage).padStart(2, "0")}
              </strong>
              <span className="truncate text-xs text-primary-foreground/65">
                本页异常
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 border-l border-primary-foreground/15 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-primary-foreground/55">
                <Timer className="size-4" />
                <span className="truncate font-mono text-[0.65rem] tracking-widest">
                  耗时
                </span>
              </div>
              <strong className="font-mono text-2xl font-medium tabular-nums sm:text-3xl">
                {averageDuration}
                <small className="ml-1 text-xs">ms</small>
              </strong>
              <span className="truncate text-xs text-primary-foreground/65">
                平均耗时
              </span>
            </div>
          </div>
        </div>
      </section>

      <Card size="sm">
        <CardHeader>
          <CardTitle>操作日志</CardTitle>
          <CardDescription>
            追踪系统写操作、响应状态及客户端来源。
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              <span className="font-mono tracking-wider">
                {hasFilters ? "已筛选" : "审计流"}
              </span>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
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
              className="sm:max-w-72"
              onChange={(event) => setKeyword(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary">
                <Search data-icon="inline-start" />
                查询
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  <RotateCcw data-icon="inline-start" />
                  重置
                </Button>
              )}
            </div>
            <div className="hidden flex-1 sm:block" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="刷新操作日志"
              title="刷新"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
            </Button>
          </form>

          <div className="audit-mobile-view flex-col overflow-hidden rounded-lg border">
            {query.isLoading ? (
              <div className="flex flex-col gap-4 p-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : query.isError ? (
              <div className="flex h-44 flex-col items-center justify-center gap-3 text-muted-foreground">
                <span>操作日志加载失败</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void query.refetch()}
                >
                  <RefreshCw data-icon="inline-start" />
                  重新加载
                </Button>
              </div>
            ) : list.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-8" />
                <span className="font-medium text-foreground">
                  暂无审计记录
                </span>
                <span className="text-xs">
                  {hasFilters
                    ? "没有匹配当前用户名的记录。"
                    : "写操作发生后会显示在这里。"}
                </span>
              </div>
            ) : (
              list.map((log, index) => {
                const success = isSuccess(log.status_code);
                return (
                  <div key={log.id}>
                    {index > 0 && <Separator />}
                    <article className="flex flex-col gap-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant={methodVariant(log.method)}>
                            {log.method || "—"}
                          </Badge>
                          <span className="truncate font-mono text-[0.65rem] tracking-wider text-muted-foreground">
                            LOG-{log.id}
                          </span>
                        </div>
                        <Badge variant={success ? "default" : "destructive"}>
                          {log.status_code ?? "—"}
                        </Badge>
                      </div>
                      <code className="break-all text-xs leading-5">
                        {log.path || "—"}
                      </code>
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                          <span className="truncate">
                            {log.username || "匿名用户"} ·{" "}
                            {log.duration_ms ?? 0} ms
                          </span>
                          <span className="truncate">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`查看日志 ${log.id}`}
                          onClick={() => setSelected(log)}
                        >
                          <Eye />
                        </Button>
                      </div>
                    </article>
                  </div>
                );
              })
            )}
          </div>

          <div className="audit-desktop-view overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>请求</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    操作用户
                  </TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="hidden md:table-cell">
                    来源 IP
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">耗时</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    发生时间
                  </TableHead>
                  <TableHead className="text-right">详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-9 w-52" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Skeleton className="h-6 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto size-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : query.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <span>操作日志加载失败</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void query.refetch()}
                        >
                          <RefreshCw data-icon="inline-start" />
                          重新加载
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="size-8" />
                        <span className="font-medium text-foreground">
                          暂无审计记录
                        </span>
                        <span>
                          {hasFilters
                            ? "没有匹配当前用户名的记录。"
                            : "写操作发生后会显示在这里。"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((log) => {
                    const success = isSuccess(log.status_code);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {log.username || "匿名用户"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={success ? "default" : "destructive"}>
                            {log.status_code ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                          {log.ip || "—"}
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs lg:table-cell">
                          {log.duration_ms ?? 0} ms
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`查看日志 ${log.id}`}
                            title="查看详情"
                            onClick={() => setSelected(log)}
                          >
                            <Eye />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <PagePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={query.data?.total ?? 0}
              onChange={setPage}
            />
          </div>
        </CardFooter>
      </Card>

      {selected && (
        <LogDetailDialog log={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
