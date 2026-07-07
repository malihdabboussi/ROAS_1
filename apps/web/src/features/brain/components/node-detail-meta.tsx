import type { ReactNode } from 'react'
import { Brain, Camera, Compass, FileText, Lightbulb } from 'lucide-react'
import type { BrainMemory } from '../types'
import {
  BELIEF_PATTERN_COLOR,
  COMPANY_OBJECT_TYPE_COLORS,
  ENTRY_TYPE_COLORS,
  knowledgeSourceTypeColor,
  knowledgeSourceTypeLabel,
  MEMORY_TYPE_COLORS,
  PERSPECTIVE_COLOR,
  SNAPSHOT_TYPE_COLORS,
} from '../types'

export type NodeDetailScopeType =
  | 'user'
  | 'agent'
  | 'campaign'
  | 'space_knowledge'
  | 'campaign_knowledge'
  | 'customer'
  | 'company'
  | 'shared'

export type NodeDetailNodeType = NonNullable<BrainMemory['node_type']>

export type NodeDetailTransferableNodeType =
  | 'memory'
  | 'snapshot'
  | 'sk_entry'
  | 'sk_source'
  | 'experience'

interface NodeDetailMeta {
  confirmWord: string
  headerTypeLabel: string
  isDeletable: boolean
  isKnowledgeNode: boolean
  isSource: boolean
  needsTypedConfirm: boolean
  nodeType: NodeDetailNodeType
  transferScopeType: 'user' | 'agent' | 'campaign'
  transferableNodeType: NodeDetailTransferableNodeType | null
  typeColor: string
  typeIcon: ReactNode
}

function typeColorForNode(node: BrainMemory, nodeType: NodeDetailNodeType): string {
  if (nodeType === 'company_object') {
    return (
      COMPANY_OBJECT_TYPE_COLORS[node.object_type ?? node.memory_type] ?? '--brain-co-belief-rgb'
    )
  }
  if (nodeType === 'company_signal') return '--brain-co-signal-rgb'
  if (nodeType === 'belief') return BELIEF_PATTERN_COLOR
  if (nodeType === 'perspective') return PERSPECTIVE_COLOR
  if (nodeType === 'snapshot') {
    return SNAPSHOT_TYPE_COLORS[node.snapshot_type ?? ''] ?? '--brain-snapshot-rgb'
  }
  if (nodeType === 'sk_entry' && node.entry_type) {
    return ENTRY_TYPE_COLORS[node.entry_type] ?? '--brain-fact-rgb'
  }
  if (nodeType === 'sk_source') return '--brain-document-rgb'
  if (nodeType === 'knowledge_item' || nodeType === 'knowledge_source') {
    return knowledgeSourceTypeColor(node.knowledge_source_type ?? node.source_type)
  }
  return MEMORY_TYPE_COLORS[node.memory_type] ?? '--brain-fact-rgb'
}

function typeIconForNode(nodeType: NodeDetailNodeType): ReactNode {
  if (nodeType === 'experience' || nodeType === 'sk_source') {
    return <FileText className="icon-sm" />
  }
  if (nodeType === 'knowledge_item' || nodeType === 'knowledge_source') {
    return <FileText className="icon-sm" />
  }
  if (nodeType === 'snapshot') return <Camera className="icon-sm" />
  if (nodeType === 'belief') return <Lightbulb className="icon-sm" />
  if (nodeType === 'perspective') return <Compass className="icon-sm" />
  return <Brain className="icon-sm" />
}

function transferableNodeTypeFor(
  nodeType: NodeDetailNodeType,
  scopeType: NodeDetailScopeType | undefined,
): NodeDetailTransferableNodeType | null {
  if (
    scopeType === 'customer' ||
    scopeType === 'company' ||
    scopeType === 'space_knowledge' ||
    scopeType === 'campaign_knowledge'
  ) {
    return null
  }
  if (nodeType === 'memory') return 'memory'
  if (nodeType === 'snapshot') return 'snapshot'
  if (nodeType === 'sk_entry') return 'sk_entry'
  if (nodeType === 'sk_source') return 'sk_source'
  if (nodeType === 'experience') return 'experience'
  return null
}

export function getNodeDetailMeta(
  node: BrainMemory,
  scopeType: NodeDetailScopeType | undefined,
): NodeDetailMeta {
  const nodeType = node.node_type ?? 'memory'
  const isKnowledgeNode = nodeType === 'knowledge_item' || nodeType === 'knowledge_source'
  const knowledgeTypeKey = node.knowledge_source_type ?? node.source_type
  const isSource = nodeType === 'sk_source' || nodeType === 'experience'

  return {
    confirmWord: isSource ? 'delete all' : 'delete',
    headerTypeLabel: isKnowledgeNode
      ? knowledgeSourceTypeLabel(knowledgeTypeKey)
      : nodeType === 'snapshot'
        ? (node.snapshot_type ?? 'Snapshot')
        : nodeType === 'experience'
          ? 'Experience'
          : nodeType === 'sk_source'
            ? 'Source'
            : nodeType === 'sk_entry'
              ? (node.entry_type ?? 'Concept')
              : nodeType === 'belief'
                ? 'Belief'
                : nodeType === 'perspective'
                  ? 'Perspective'
                  : node.memory_type,
    isDeletable: ['memory', 'snapshot', 'sk_source', 'sk_entry', 'experience'].includes(nodeType),
    isKnowledgeNode,
    isSource,
    needsTypedConfirm: isSource,
    nodeType,
    transferScopeType:
      scopeType === 'agent' ? 'agent' : scopeType === 'campaign' ? 'campaign' : 'user',
    transferableNodeType: transferableNodeTypeFor(nodeType, scopeType),
    typeColor: typeColorForNode(node, nodeType),
    typeIcon: typeIconForNode(nodeType),
  }
}
