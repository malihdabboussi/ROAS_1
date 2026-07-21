import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'

export type BrainScopeBreadcrumbSegment = {
  label: string
  isCurrent: boolean
}

export function buildBrainScopeBreadcrumbs(
  scope: BrainScopeNavOption | undefined,
): BrainScopeBreadcrumbSegment[] {
  const root: BrainScopeBreadcrumbSegment = { label: 'Brain', isCurrent: false }
  if (!scope) return [{ ...root, isCurrent: true }]

  switch (scope.scopeType) {
    case 'user':
    case 'person':
    case 'shared':
      return [root, { label: scope.label, isCurrent: true }]
    case 'customer':
      return [root, { label: 'Customer', isCurrent: true }]
    case 'company':
      return [root, { label: 'Company', isCurrent: false }, { label: scope.label, isCurrent: true }]
    case 'agent':
      return [root, { label: 'Agents', isCurrent: false }, { label: scope.label, isCurrent: true }]
    case 'campaign_knowledge': {
      const name = scope.label.replace(/\s+Knowledge$/i, '').trim() || scope.label
      return [
        root,
        { label: 'Campaign Knowledge', isCurrent: false },
        { label: name, isCurrent: true },
      ]
    }
    case 'campaign':
      return [
        root,
        { label: 'Campaigns', isCurrent: false },
        { label: scope.label, isCurrent: true },
      ]
    default:
      return [root, { label: scope.label, isCurrent: true }]
  }
}
