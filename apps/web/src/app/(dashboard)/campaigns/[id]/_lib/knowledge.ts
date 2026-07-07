import type { CampaignKnowledgeNode } from '@/features/studio/services/campaign-knowledge.service'

export function extractIngestedDeliverableIds(nodes: CampaignKnowledgeNode[]): Set<string> {
  const ids = nodes
    .filter(
      (node) =>
        node.source_type === 'mission' && node.node_type === 'deliverable' && node.source_id,
    )
    .map((node) => String(node.source_id))
  return new Set(ids)
}
