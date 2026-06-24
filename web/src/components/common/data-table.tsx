"use client"

import type { ReactNode } from 'react'
import * as React from 'react'
import type { Column, ColumnDef, Row, Table as TanStackTable } from '@tanstack/react-table'
import {
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  EyeOff,
  RefreshCw,
  Settings2,
  TableProperties,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { PagePagination } from '@/components/common/page-pagination'

export interface DataTableColumnMeta<TData> {
  headerClassName?: string
  cellClassName?: string | ((row: Row<TData>) => string | undefined)
}

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<
  TData,
  TValue
> & {
  className?: string
  meta?: DataTableColumnMeta<TData>
}

interface LegacyDataTableColumn {
  header: ReactNode
  className?: string
}

interface DataTablePagination {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

interface DataTableProps<TData, TValue = unknown> {
  columns: Array<DataTableColumnDef<TData, TValue> | LegacyDataTableColumn>
  data?: TData[]
  children?: ReactNode
  loading?: boolean
  error?: boolean
  empty?: boolean
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  loadingRows?: number
  onRetry?: () => void
  pagination?: DataTablePagination
  className?: string
  bodyClassName?: string
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  rowClassName?: string | ((row: Row<TData>) => string | undefined)
  onRowClick?: (row: TData) => void
  filterColumn?: string
  filterPlaceholder?: string
  showColumnToggle?: boolean
  showSelectionCount?: boolean
  clientPagination?: boolean
  pageSizes?: number[]
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  children,
  loading = false,
  error = false,
  empty,
  emptyTitle = '暂无数据',
  emptyDescription,
  emptyAction,
  loadingRows = 5,
  onRetry,
  pagination,
  className,
  bodyClassName,
  getRowId,
  rowClassName,
  onRowClick,
  filterColumn,
  filterPlaceholder = '筛选数据...',
  showColumnToggle = false,
  showSelectionCount = false,
  clientPagination = false,
  pageSizes,
}: DataTableProps<TData, TValue>) {
  'use no memo'

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const colSpan = Math.max(columns.length, 1)
  const tableColumns = columns as DataTableColumnDef<TData, TValue>[]
  // TanStack Table intentionally returns function-bearing table instances.
  // React Compiler cannot safely memoize this hook, so keep the opt-out local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(clientPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getRowId,
    manualPagination: Boolean(pagination),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })
  const hasTanStackData = data !== undefined
  const isEmpty = empty ?? (hasTanStackData ? data.length === 0 : false)
  const hasToolbar = hasTanStackData && (filterColumn || showColumnToggle)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {hasToolbar && (
        <DataTableToolbar
          table={table}
          filterColumn={filterColumn}
          filterPlaceholder={filterPlaceholder}
          showColumnToggle={showColumnToggle}
        />
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {hasTanStackData ? (
              table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef
                      .meta as DataTableColumnMeta<TData> | undefined
                    const columnClassName = (
                      header.column.columnDef as DataTableColumnDef<
                        TData,
                        TValue
                      >
                    ).className
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(columnClassName, meta?.headerClassName)}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                {(columns as LegacyDataTableColumn[]).map((column, index) => (
                  <TableHead key={index} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            )}
          </TableHeader>
          <TableBody className={bodyClassName}>
            {loading ? (
              <DataTableLoading colSpan={colSpan} rows={loadingRows} />
            ) : error ? (
              <DataTableMessage
                colSpan={colSpan}
                title="数据加载失败"
                description="请稍后重试，或检查当前筛选条件。"
                action={
                  onRetry ? (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      <RefreshCw data-icon="inline-start" />
                      重新加载
                    </Button>
                  ) : null
                }
              />
            ) : isEmpty ? (
              <DataTableMessage
                colSpan={colSpan}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
              />
            ) : hasTanStackData ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    typeof rowClassName === 'function'
                      ? rowClassName(row)
                      : rowClassName,
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef
                      .meta as DataTableColumnMeta<TData> | undefined
                    const cellClassName =
                      typeof meta?.cellClassName === 'function'
                        ? meta.cellClassName(row)
                        : meta?.cellClassName
                    return (
                      <TableCell key={cell.id} className={cellClassName}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              children
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <PagePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
        />
      )}
      {hasTanStackData && clientPagination && !pagination && (
        <DataTablePagination
          table={table}
          pageSizes={pageSizes}
          showSelectionCount={showSelectionCount}
        />
      )}
    </div>
  )
}

interface DataTableToolbarProps<TData> {
  table: TanStackTable<TData>
  filterColumn?: string
  filterPlaceholder: string
  showColumnToggle: boolean
}

function DataTableToolbar<TData>({
  table,
  filterColumn,
  filterPlaceholder,
  showColumnToggle,
}: DataTableToolbarProps<TData>) {
  const column = filterColumn ? table.getColumn(filterColumn) : undefined

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {column ? (
        <Input
          className="sm:max-w-xs"
          placeholder={filterPlaceholder}
          value={(column.getFilterValue() as string) ?? ''}
          onChange={(event) => column.setFilterValue(event.target.value)}
        />
      ) : (
        <div />
      )}
      {showColumnToggle && <DataTableViewOptions table={table} />}
    </div>
  )
}

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown data-icon="inline-end" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp data-icon="inline-end" />
            ) : (
              <ChevronsUpDown data-icon="inline-end" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUp />
              升序
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDown />
              降序
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                  <EyeOff />
                  隐藏
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function DataTableViewOptions<TData>({
  table,
}: {
  table: TanStackTable<TData>
}) {
  const columns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())

  if (columns.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 sm:ml-auto">
          <Settings2 data-icon="inline-start" />
          列
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DataTablePagination<TData>({
  table,
  pageSizes = [10, 20, 30, 40, 50],
  showSelectionCount,
}: {
  table: TanStackTable<TData>
  pageSizes?: number[]
  showSelectionCount?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 px-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        {showSelectionCount
          ? `${table.getFilteredSelectedRowModel().rows.length} / ${table.getFilteredRowModel().rows.length} 行已选择`
          : `共 ${table.getFilteredRowModel().rows.length} 条`}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">每页</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizes.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-24 text-center font-medium text-foreground">
          第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}{' '}
          页
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            <span className="sr-only">第一页</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          >
            <span className="sr-only">最后一页</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DataTableLoading({
  colSpan,
  rows,
}: {
  colSpan: number
  rows: number
}) {
  return Array.from({ length: rows }, (_, index) => (
    <TableRow key={index}>
      <TableCell colSpan={colSpan}>
        <div className="flex items-center gap-3 py-1">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      </TableCell>
    </TableRow>
  ))
}

function DataTableMessage({
  colSpan,
  title,
  description,
  action,
}: {
  colSpan: number
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-44 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <TableProperties className="size-8" />
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{title}</span>
            {description && <span>{description}</span>}
          </div>
          {action}
        </div>
      </TableCell>
    </TableRow>
  )
}
