import { Fragment } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { treeNodeState, type CheckState, type TreeLike } from '@/lib/tree'

/** Map our tri-state to Radix's `CheckedState` (`boolean | "indeterminate"`). */
function toCheckedState(state: CheckState): boolean | 'indeterminate' {
  if (state === 'checked') return true
  if (state === 'indeterminate') return 'indeterminate'
  return false
}

interface TreeCheckboxProps<T extends TreeLike> {
  nodes: T[]
  checked: Set<string>
  onToggle: (id: string) => void
  /** When true, parent rows reflect their children (checked / indeterminate). */
  linked?: boolean
  depth?: number
}

export function TreeCheckbox<T extends TreeLike>({
  nodes,
  checked,
  onToggle,
  linked = false,
  depth = 0,
}: TreeCheckboxProps<T>) {
  return (
    <>
      {nodes.map((node) => (
        <Fragment key={node.id}>
          <label
            className="flex cursor-pointer items-center gap-2 rounded-md py-1 hover:bg-accent"
            style={{ paddingLeft: depth * 20 + 4 }}
          >
            <Checkbox
              checked={
                linked
                  ? toCheckedState(treeNodeState(node, checked))
                  : checked.has(node.id)
              }
              onCheckedChange={() => onToggle(node.id)}
            />
            <span className="text-sm">{node.name}</span>
          </label>
          {node.children?.length ? (
            <TreeCheckbox
              nodes={node.children as T[]}
              checked={checked}
              onToggle={onToggle}
              linked={linked}
              depth={depth + 1}
            />
          ) : null}
        </Fragment>
      ))}
    </>
  )
}
