import { Fragment } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { TreeLike } from '@/lib/tree'

interface TreeCheckboxProps<T extends TreeLike> {
  nodes: T[]
  checked: Set<string>
  onToggle: (id: string) => void
  depth?: number
}

export function TreeCheckbox<T extends TreeLike>({
  nodes,
  checked,
  onToggle,
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
              checked={checked.has(node.id)}
              onCheckedChange={() => onToggle(node.id)}
            />
            <span className="text-sm">{node.name}</span>
          </label>
          {node.children?.length ? (
            <TreeCheckbox
              nodes={node.children as T[]}
              checked={checked}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ) : null}
        </Fragment>
      ))}
    </>
  )
}
