import type { UiSelectedArtifact } from '@/lib/chat/ui-selected-artifact'
import type {
  VibeyPendingArtifactOpen,
  VibeyPendingArtifactOpenSimpleType,
} from '@/lib/artifacts/pending-artifact-open'
import type { ArtifactPreviewResource as SelectedResource, FunnelPage } from '@/lib/artifacts'
import type { ArtifactsState, TreeNode } from '../tree/types'

export function sortPages(pages: FunnelPage[]): FunnelPage[] {
  return [...pages].sort(
    (a, b) =>
      ((a as { order_index?: number }).order_index ?? a.sort_order ?? 0) -
      ((b as { order_index?: number }).order_index ?? b.sort_order ?? 0),
  )
}

export function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function normalizePendingArtifactOpen(raw: unknown): VibeyPendingArtifactOpen | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.kind === 'sequence-email') {
    if (
      typeof o.sequenceId === 'string' &&
      typeof o.emailId === 'string' &&
      typeof o.name === 'string'
    ) {
      return { kind: 'sequence-email', sequenceId: o.sequenceId, emailId: o.emailId, name: o.name }
    }
    return null
  }
  if (o.kind === 'page') {
    if (
      typeof o.funnelId === 'string' &&
      typeof o.pageId === 'string' &&
      typeof o.name === 'string'
    ) {
      return { kind: 'page', funnelId: o.funnelId, pageId: o.pageId, name: o.name }
    }
    return null
  }
  if (o.kind === 'offer-step') {
    if (
      typeof o.offerId === 'string' &&
      typeof o.stepNumber === 'number' &&
      typeof o.name === 'string'
    ) {
      return { kind: 'offer-step', offerId: o.offerId, stepNumber: o.stepNumber, name: o.name }
    }
    return null
  }
  if (o.kind === 'simple') {
    if (typeof o.type === 'string' && typeof o.id === 'string' && typeof o.name === 'string') {
      return {
        kind: 'simple',
        type: o.type as VibeyPendingArtifactOpenSimpleType,
        id: o.id,
        name: o.name,
        ...(typeof o.funnelId === 'string' ? { funnelId: o.funnelId } : {}),
      }
    }
    return null
  }
  if (typeof o.type === 'string' && typeof o.id === 'string' && typeof o.name === 'string') {
    return {
      kind: 'simple',
      type: o.type as VibeyPendingArtifactOpenSimpleType,
      id: o.id,
      name: o.name,
      ...(typeof o.funnelId === 'string' ? { funnelId: o.funnelId } : {}),
    }
  }
  return null
}

function treeIdForSimpleType(type: VibeyPendingArtifactOpenSimpleType, resourceId: string): string {
  if (type === 'presentation') return `pres-${resourceId}`
  if (type === 'ad-campaign') return `adcamp-${resourceId}`
  if (type === 'ad-set') return `adset-${resourceId}`
  return `${type}-${resourceId}`
}

export function pendingToSyntheticTreeNode(pending: VibeyPendingArtifactOpen): TreeNode {
  const nullIcon = null
  if (pending.kind === 'simple') {
    return {
      id: treeIdForSimpleType(pending.type, pending.id),
      label: pending.name,
      type: pending.type as TreeNode['type'],
      resourceId: pending.id,
      funnelId: pending.funnelId,
      icon: nullIcon,
      children: [],
    }
  }
  if (pending.kind === 'sequence-email') {
    return {
      id: `email-${pending.emailId}`,
      label: pending.name,
      type: 'sequence-email',
      resourceId: pending.sequenceId,
      emailId: pending.emailId,
      icon: nullIcon,
      children: [],
    }
  }
  if (pending.kind === 'offer-step') {
    return {
      id: `offer-${pending.offerId}-step-${pending.stepNumber}`,
      label: pending.name,
      type: 'offer-step',
      resourceId: pending.offerId,
      stepNumber: pending.stepNumber,
      icon: nullIcon,
      children: [],
    }
  }
  return {
    id: `page-${pending.pageId}`,
    label: pending.name,
    type: 'page',
    funnelId: pending.funnelId,
    pageId: pending.pageId,
    icon: nullIcon,
    children: [],
  }
}

export function buildActiveArtifactSelection(
  selected: SelectedResource | null,
  currentPageId: string | null,
  campaignId: string,
): UiSelectedArtifact | null {
  if (!selected) return null
  if (
    (selected.type === 'page' && selected.pageId && selected.funnelId) ||
    (selected.type === 'funnel' && currentPageId && selected.id)
  ) {
    const pageId = selected.type === 'page' ? selected.pageId : currentPageId
    if (!pageId) return null
    return {
      type: 'funnel_page',
      id: pageId,
      label: selected.name,
      campaign_id: campaignId,
      parent: {
        type: 'funnel',
        id: selected.type === 'page' ? selected.funnelId : selected.id,
      },
    }
  }
  if (selected.type === 'sequence' && selected.emailId) {
    return {
      type: 'sequence_email',
      id: selected.emailId,
      label: selected.name,
      campaign_id: campaignId,
      parent: { type: 'sequence', id: selected.id },
    }
  }
  if (selected.type === 'category-settings' || selected.type === 'blog-hub') return null
  return {
    type: selected.type,
    id: selected.id,
    label: selected.name,
    campaign_id: campaignId,
  }
}

export function getAdSetOptions(adCampaigns: ArtifactsState['adCampaigns']) {
  const result: Array<{ id: string; name: string; campaignName: string }> = []
  for (const camp of adCampaigns ?? []) {
    for (const set of camp.ad_sets ?? []) {
      result.push({
        id: set.id,
        name: set.name || 'Untitled Ad Set',
        campaignName: camp.name || 'Untitled Campaign',
      })
    }
  }
  return result
}
