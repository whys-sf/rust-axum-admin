export interface TreeLike {
  id: string
  name: string
  children?: TreeLike[]
}

export interface FlatOption {
  id: string
  name: string
  depth: number
  type?: number
}

/** Flatten a forest into depth-tagged options for `<select>`-style pickers. */
export function flattenTree<T extends TreeLike>(
  nodes: T[],
  depth = 0,
  acc: FlatOption[] = [],
  filter?: (node: T) => boolean,
): FlatOption[] {
  for (const node of nodes) {
    if (filter && !filter(node)) continue
    acc.push({ id: node.id, name: node.name, depth, type: 'type' in node ? (node as { type?: number }).type : undefined })
    if (node.children?.length) {
      flattenTree(node.children as T[], depth + 1, acc, filter)
    }
  }
  return acc
}
