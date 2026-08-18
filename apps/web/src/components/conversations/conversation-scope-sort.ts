const GENERAL_LABEL = 'general'
const GENERIC_SCOPE_PARENTS = new Set(['client spaces', 'clients'])

export function isGeneralLabel(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === GENERAL_LABEL
}

function isGenericScopeParent(value: string): boolean {
  return GENERIC_SCOPE_PARENTS.has(value.trim().toLowerCase())
}

/** First ancestor that is not General / Clients / Client Spaces. */
export function firstSpecificAncestor(
  names: Array<string | null | undefined>,
): string | null {
  for (const name of names) {
    const trimmed = name?.trim() ?? ''
    if (trimmed.length > 0 && !isGeneralLabel(trimmed) && !isGenericScopeParent(trimmed)) {
      return trimmed
    }
  }
  return null
}

export function compareGeneralFirst(a: string, b: string): number {
  const aGeneral = isGeneralLabel(a)
  const bGeneral = isGeneralLabel(b)
  if (aGeneral && !bGeneral) return -1
  if (!aGeneral && bGeneral) return 1
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortGeneralFirst<T>(items: readonly T[], nameOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareGeneralFirst(nameOf(a), nameOf(b)))
}

/** When the leaf is General, prefix the first specific ancestor so 100 Generals stay distinguishable. */
export function qualifyGeneralLocation(input: {
  leafName?: string | null
  parentName?: string | null
  ancestors?: Array<string | null | undefined>
}): string | null {
  const leafName = input.leafName?.trim()
  if (!leafName) return null
  if (!isGeneralLabel(leafName)) return leafName
  const parent = firstSpecificAncestor([...(input.ancestors ?? []), input.parentName])
  return parent ? `${parent} General` : leafName
}
