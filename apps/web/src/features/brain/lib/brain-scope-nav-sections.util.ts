import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'

export type BrainScopeNavSection = {
  id: string
  title: string
  scopeTypes: BrainScopeNavOption['scopeType'][]
  orgOnly?: boolean
}

export const BRAIN_SCOPE_NAV_SECTIONS: BrainScopeNavSection[] = [
  { id: 'user', title: 'User brains', scopeTypes: ['user', 'shared'] },
  { id: 'company', title: 'Company brains', scopeTypes: ['company'], orgOnly: true },
  { id: 'customer', title: 'Customer brains', scopeTypes: ['customer'] },
  { id: 'agent', title: 'Agent brains', scopeTypes: ['agent'] },
  { id: 'campaign_knowledge', title: 'Campaign Knowledge', scopeTypes: ['campaign_knowledge'] },
]

function sectionIncludesScope(
  section: BrainScopeNavSection,
  scopeType: BrainScopeNavOption['scopeType'],
): boolean {
  return section.scopeTypes.includes(scopeType)
}

export function buildBrainScopeNavSectionGroups(
  scopeOptions: BrainScopeNavOption[],
  isOrg: boolean,
): Array<{ section: BrainScopeNavSection; items: BrainScopeNavOption[] }> {
  const cmp = (a: BrainScopeNavOption, b: BrainScopeNavOption) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })

  return BRAIN_SCOPE_NAV_SECTIONS.flatMap((section) => {
    if (section.orgOnly && !isOrg) return []
    const items = scopeOptions
      .filter((option) => sectionIncludesScope(section, option.scopeType))
      .sort(cmp)
    if (items.length === 0) return []
    return [{ section, items }]
  })
}

export function brainScopeSectionIdForScope(scope: BrainScopeNavOption | undefined): string | null {
  if (!scope) return null
  const match = BRAIN_SCOPE_NAV_SECTIONS.find((section) =>
    sectionIncludesScope(section, scope.scopeType),
  )
  return match?.id ?? null
}
