const GENERAL_LABEL = 'general'

export function isGeneralLabel(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === GENERAL_LABEL
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

/** When the leaf is General, prefix the parent so 100 Generals stay distinguishable. */
export function qualifyGeneralLocation(input: {
  leafName?: string | null
  parentName?: string | null
}): string | null {
  const leafName = input.leafName?.trim()
  if (!leafName) return null
  const parentName = input.parentName?.trim()
  if (isGeneralLabel(leafName) && parentName && !isGeneralLabel(parentName)) {
    return `${parentName} General`
  }
  return leafName
}
