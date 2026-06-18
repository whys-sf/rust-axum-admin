export interface TreeLike {
  id: string
  name: string
  children?: TreeLike[]
}

export interface FlatOption {
  id: string
  name: string
  depth: number
}

/** Flatten a forest into depth-tagged options for `<select>`-style pickers. */
export function flattenTree<T extends TreeLike>(
  nodes: T[],
  depth = 0,
  acc: FlatOption[] = [],
): FlatOption[] {
  for (const node of nodes) {
    acc.push({ id: node.id, name: node.name, depth })
    if (node.children?.length) {
      flattenTree(node.children as T[], depth + 1, acc)
    }
  }
  return acc
}
