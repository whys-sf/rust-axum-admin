export const MENU_TYPE: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  1: { label: '目录', variant: 'default' },
  2: { label: '菜单', variant: 'secondary' },
  3: { label: '按钮', variant: 'outline' },
}

export const DATA_SCOPE_OPTIONS = [
  { value: 1, label: '全部数据' },
  { value: 2, label: '自定义部门' },
  { value: 3, label: '本部门' },
  { value: 4, label: '本部门及以下' },
  { value: 5, label: '仅本人' },
] as const

export const DATA_SCOPE_CUSTOM = 2

export function dataScopeLabel(value: number): string {
  return DATA_SCOPE_OPTIONS.find((o) => o.value === value)?.label ?? String(value)
}
