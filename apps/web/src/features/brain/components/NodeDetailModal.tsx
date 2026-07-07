'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, Copy, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { transferBrainNode } from '@/features/brain/services/brain.service'
import { deleteCampaignKnowledgeNode } from '@/lib/campaigns'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { deleteBrainMemory, deleteBrainSnapshot } from '../services/brain.service'
import { deleteSkEntry, deleteSkSource } from '../services/sk.service'
import type { BrainMemory } from '../types'
import {
  NodeDetailBeliefSection,
  NodeDetailCompanyObjectSection,
  NodeDetailCompanySignalSection,
  NodeDetailExperienceSection,
  NodeDetailPerspectiveSection,
} from './NodeDetailCognitionSections'
import { NodeDetailDeleteDialog } from './NodeDetailDeleteDialog'
import {
  NodeDetailKnowledgeSourceSection,
  NodeDetailSkEntrySection,
  NodeDetailSkSourceSection,
  NodeDetailSnapshotSection,
} from './NodeDetailKnowledgeSections'
import { NodeDetailMemorySection } from './NodeDetailMemorySection'
import {
  NodeDetailTransferDialog,
  type NodeDetailTransferOperation,
  type NodeDetailTransferTarget,
} from './NodeDetailTransferDialog'
import {
  getNodeDetailMeta,
  type NodeDetailScopeType,
} from './node-detail-meta'
import { temporalRows } from './node-detail-formatters'
import { useNodeDetailSpeakerName } from './use-node-detail-speaker-name'

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}

// ============================================================================
// Props
// ============================================================================

interface NodeDetailModalProps {
  node: BrainMemory
  scopeType?: NodeDetailScopeType
  campaignId?: string | null
  agentId?: string | null
  scopeOptions?: Array<{
    id: string
    label: string
    scopeType: 'user' | 'agent' | 'campaign'
    agentId: string | null
    campaignId?: string
  }>
  currentScopeId?: string | null
  connectedNodes?: BrainMemory[]
  onClose: () => void
  onDeleted?: (nodeId: string) => void
}

// ============================================================================
// Component
// ============================================================================

export default function NodeDetailModal({
  node,
  scopeType,
  campaignId,
  agentId,
  scopeOptions = [],
  currentScopeId,
  connectedNodes = [],
  onClose,
  onDeleted,
}: NodeDetailModalProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [transferModalOpen, setTransferModalOpen] =
    useState<NodeDetailTransferOperation | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<string>('')
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false)

  useEffect(() => {
    if (!transferDropdownOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-transfer-dropdown]')) {
        setTransferDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [transferDropdownOpen])
  const {
    confirmWord,
    headerTypeLabel,
    isDeletable,
    isKnowledgeNode,
    isSource,
    needsTypedConfirm,
    nodeType,
    transferScopeType,
    transferableNodeType,
    typeColor,
    typeIcon,
  } = getNodeDetailMeta(node, scopeType)
  const speakerName = useNodeDetailSpeakerName(node.speaker)
  const transferTargets = scopeOptions.filter((option) => option.id !== currentScopeId)

  useEffect(() => {
    if (!transferTargets.length) {
      setTransferTargetId('')
      return
    }
    setTransferTargetId((prev) => {
      if (prev && transferTargets.some((t) => t.id === prev)) return prev
      return transferTargets[0]?.id ?? ''
    })
  }, [transferTargets])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (nodeType === 'experience') {
        const targets = connectedNodes.filter((candidate) =>
          ['memory', 'snapshot', 'sk_entry'].includes(candidate.node_type ?? 'memory'),
        )
        for (const target of targets) {
          if ((target.node_type ?? 'memory') === 'memory') {
            await deleteBrainMemory(target.id)
          } else if (target.node_type === 'snapshot') {
            await deleteBrainSnapshot(target.id)
          } else if (target.node_type === 'sk_entry') {
            if (scopeType === 'campaign' && campaignId) {
              await deleteCampaignKnowledgeNode(campaignId, target.id)
            } else {
              await deleteSkEntry(target.id)
            }
          }
        }
        toast.success(`Source deleted. ${targets.length} connected memories removed.`)
      } else if (nodeType === 'memory') {
        await deleteBrainMemory(node.id)
        toast.success('Memory deleted.')
      } else if (nodeType === 'snapshot') {
        await deleteBrainSnapshot(node.id)
        toast.success('Neural snapshot deleted.')
      } else if (nodeType === 'sk_source') {
        if (scopeType === 'campaign') {
          if (!campaignId) throw new Error('Campaign id is required')
          const targets = connectedNodes.filter((candidate) => candidate.node_type === 'sk_entry')
          for (const target of targets) {
            await deleteCampaignKnowledgeNode(campaignId, target.id)
          }
          toast.success(`Source deleted. ${targets.length} connected memories removed.`)
        } else {
          const result = await deleteSkSource(node.id)
          toast.success(`Source deleted. ${result.deletedEntries} knowledge entries removed.`)
        }
      } else if (nodeType === 'sk_entry') {
        if (scopeType === 'campaign') {
          if (!campaignId) throw new Error('Campaign id is required')
          await deleteCampaignKnowledgeNode(campaignId, node.id)
        } else {
          await deleteSkEntry(node.id)
        }
        toast.success('Knowledge entry deleted.')
      }
      setDeleteConfirmOpen(false)
      onDeleted?.(node.id)
      onClose()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Delete failed.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleTransfer = async (operation: NodeDetailTransferOperation) => {
    if (!transferableNodeType) return
    const target = transferTargets.find((option) => option.id === transferTargetId)
    if (!target) {
      toast.error('Select a target brain first.')
      return
    }
    setTransferring(true)
    try {
      await transferBrainNode({
        operation,
        node_type: transferableNodeType,
        node_id: node.id,
        source_scope: {
          type: transferScopeType,
          ...(scopeType === 'agent' && agentId ? { agent_id: agentId } : {}),
          ...(scopeType === 'campaign' && campaignId ? { campaign_id: campaignId } : {}),
        },
        target_scope: {
          type: target.scopeType,
          ...(target.scopeType === 'agent' && target.agentId ? { agent_id: target.agentId } : {}),
          ...(target.scopeType === 'campaign' && target.campaignId
            ? { campaign_id: target.campaignId }
            : {}),
        },
        connected_node_ids: connectedNodes.map((entry) => entry.id),
        source_type: node.source_type,
        source_id: node.source_id ?? null,
        source_title: node.source_title ?? node.name ?? node.content ?? null,
      })
      toast.success(operation === 'move' ? 'Moved to target brain.' : 'Copied to target brain.')
      setTransferModalOpen(null)
      onDeleted?.(node.id)
      if (operation === 'move') onClose()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Transfer failed.'))
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="p-spacing-4 pointer-events-none absolute right-0 top-0 z-40">
      {/* Panel */}
      <div className="surface-card border-border pointer-events-auto max-h-[80vh] w-96 max-w-full overflow-y-auto rounded-xl border shadow-xl">
        {/* Header */}
        <div className="px-spacing-4 py-spacing-3 border-border flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <span style={{ color: `rgb(var(${typeColor}))` }}>{typeIcon}</span>
            <Badge label={headerTypeLabel.toUpperCase()} color={`rgb(var(${typeColor}))`} />
          </div>
          <div className="flex items-center gap-1">
            {transferableNodeType && transferTargets.length > 0 && (
              <>
                <Tooltip label="Move to another brain" side="bottom">
                  <button
                    onClick={() => setTransferModalOpen('move')}
                    className="hover:bg-hover-subtle flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  >
                    <ArrowRightLeft className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip label="Copy to another brain" side="bottom">
                  <button
                    onClick={() => setTransferModalOpen('copy')}
                    className="hover:bg-hover-subtle flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  >
                    <Copy className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </>
            )}
            {isDeletable && (
              <Tooltip label="Delete" side="bottom">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(true)
                    setDeleteConfirmInput('')
                  }}
                  className="hover:bg-destructive/10 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                >
                  <Trash2 className="text-destructive h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            <button onClick={onClose} className="btn-icon-bare">
              <X className="icon-sm" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-spacing-4 py-spacing-4 space-y-spacing-4">
          {/* ---- Knowledge graph object (read-only) ---- */}
          {isKnowledgeNode && (
            <NodeDetailKnowledgeSourceSection node={node} />
          )}

          {/* ---- Memory View ---- */}
          {nodeType === 'memory' && (
            <NodeDetailMemorySection
              node={node}
              speakerName={speakerName}
              temporalRows={temporalRows(node)}
              typeColor={typeColor}
            />
          )}

          {/* ---- Snapshot View ---- */}
          {nodeType === 'snapshot' && (
            <NodeDetailSnapshotSection node={node} typeColor={typeColor} />
          )}

          {/* ---- SK Entry View ---- */}
          {nodeType === 'sk_entry' && (
            <NodeDetailSkEntrySection node={node} typeColor={typeColor} />
          )}

          {/* ---- SK Source View ---- */}
          {nodeType === 'sk_source' && (
            <NodeDetailSkSourceSection node={node} />
          )}

          {/* ---- Company Cortex Object (read-only) ---- */}
          {nodeType === 'company_object' && (
            <NodeDetailCompanyObjectSection node={node} typeColor={typeColor} />
          )}

          {nodeType === 'company_signal' && (
            <NodeDetailCompanySignalSection node={node} typeColor={typeColor} />
          )}

          {/* ---- Belief Pattern View ---- */}
          {nodeType === 'belief' && (
            <NodeDetailBeliefSection node={node} typeColor={typeColor} />
          )}

          {/* ---- Perspective View ---- */}
          {nodeType === 'perspective' && (
            <NodeDetailPerspectiveSection node={node} typeColor={typeColor} />
          )}

          {/* ---- Experience View ---- */}
          {nodeType === 'experience' && (
            <NodeDetailExperienceSection node={node} />
          )}
        </div>
      </div>

      <NodeDetailDeleteDialog
        confirmWord={confirmWord}
        deleteConfirmInput={deleteConfirmInput}
        deleting={deleting}
        isSource={isSource}
        needsTypedConfirm={needsTypedConfirm}
        nodeType={nodeType}
        onDelete={handleDelete}
        onInputChange={setDeleteConfirmInput}
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteConfirmOpen(open)
            setDeleteConfirmInput('')
          }
        }}
      />

      <NodeDetailTransferDialog
        isSource={isSource}
        onDropdownOpenChange={setTransferDropdownOpen}
        onOpenChange={(open) => {
          if (!transferring && !open) {
            setTransferModalOpen(null)
            setTransferDropdownOpen(false)
          }
        }}
        onTargetChange={setTransferTargetId}
        onTransfer={handleTransfer}
        openOperation={transferModalOpen}
        targetId={transferTargetId}
        targets={transferTargets as NodeDetailTransferTarget[]}
        transferDropdownOpen={transferDropdownOpen}
        transferring={transferring}
      />
    </div>
  )
}
