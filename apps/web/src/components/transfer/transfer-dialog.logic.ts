import type { OrgMembership } from '@/lib/org'
import {
  canTransferAcrossContext,
  type TransferEntityType,
  type TransferMode,
} from '@/lib/transfer'

export interface TransferDisplayGroup {
  key: string
  label: string
  tables: string[]
}

export interface TransferDestination {
  key: string
  org_id: string | null
  label: string
}

export const TRANSFER_DISPLAY_GROUPS: TransferDisplayGroup[] = [
  { key: 'offers', label: 'Offers', tables: ['offers'] },
  { key: 'avatars', label: 'Avatars', tables: ['avatars'] },
  { key: 'presentations', label: 'Presentations', tables: ['presentations'] },
  { key: 'funnels', label: 'Funnels & Pages', tables: ['funnels'] },
  { key: 'sequences', label: 'Email Sequences', tables: ['sequences'] },
  { key: 'social_posts', label: 'Social Posts', tables: ['social_posts'] },
  { key: 'blog_posts', label: 'Blog Posts', tables: ['blog_posts'] },
  { key: 'ad_campaigns', label: 'Ad Campaigns', tables: ['ad_campaigns'] },
  { key: 'media_assets', label: 'Media Files', tables: ['media_assets'] },
  { key: 'leads', label: 'Leads', tables: ['leads'] },
  { key: 'conversations', label: 'Conversations', tables: ['conversations'] },
  { key: 'missions', label: 'Missions', tables: ['missions'] },
  {
    key: 'knowledge',
    label: 'Campaign Knowledge',
    tables: ['campaign_nodes', 'campaign_edges', 'campaign_node_sources'],
  },
  {
    key: 'workflows',
    label: 'Workflows',
    tables: ['campaign_workflows', 'campaign_workflow_edges', 'campaign_workflow_layouts'],
  },
  { key: 'tasks', label: 'Tasks', tables: ['campaign_tasks'] },
  {
    key: 'strategy',
    label: 'Strategy Plans',
    tables: ['campaign_plans', 'campaign_strategy_nodes'],
  },
  { key: 'integrations', label: 'Integrations', tables: ['campaign_integration_connections'] },
]

export function getTransferGroupCount(
  group: TransferDisplayGroup,
  children: Record<string, number>,
): number {
  return group.tables.reduce((sum, table) => sum + (children[table] ?? 0), 0)
}

export function getTransferEntityLabel(entityType: TransferEntityType): string {
  if (entityType === 'campaign') return 'Campaign'
  if (entityType === 'media') return 'Media'
  if (entityType === 'space') return 'Space'
  if (entityType === 'view') return 'View'
  return 'Artifact'
}

export function buildTransferDestinations(
  currentOrgId: string | null,
  memberships: OrgMembership[],
  mode: TransferMode,
): TransferDestination[] {
  const destinations: TransferDestination[] = []

  if (currentOrgId !== null && canTransferAcrossContext(mode, currentOrgId, null, memberships)) {
    destinations.push({ key: 'personal', org_id: null, label: 'Personal Account' })
  }

  for (const membership of memberships) {
    if (membership.org_id === currentOrgId) continue
    if (membership.status !== 'active') continue
    if (!canTransferAcrossContext(mode, currentOrgId, membership.org_id, memberships)) continue
    destinations.push({
      key: membership.org_id,
      org_id: membership.org_id,
      label: membership.organizations.name,
    })
  }

  return destinations
}
