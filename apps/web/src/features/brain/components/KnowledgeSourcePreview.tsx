'use client'

import { ArtifactInlinePreviewCard } from '@/components/artifacts'
import { resolveKnowledgeSourcePreviewProps } from '../lib/knowledge-source-preview'
import type { BrainMemory } from '../types'
import { KnowledgeSourceMediaPreview } from './KnowledgeSourceMediaPreview'

interface KnowledgeSourcePreviewProps {
  node: BrainMemory
  sourceHref?: string | null
}

function openKnowledgeSource(node: BrainMemory, sourceHref: string | null | undefined) {
  if (sourceHref) {
    window.open(sourceHref, '_blank', 'noopener,noreferrer')
    return
  }

  const preview = resolveKnowledgeSourcePreviewProps(node)
  if (!preview) return

  window.dispatchEvent(
    new CustomEvent('vibey-open-artifact', {
      detail: {
        artifactType: preview.artifactType,
        artifactId: preview.artifactId,
        name: preview.name,
        spaceId: preview.spaceId,
      },
    }),
  )
}

export function KnowledgeSourcePreview({ node, sourceHref }: KnowledgeSourcePreviewProps) {
  const name = node.name ?? node.source_title ?? 'Source'
  const sourceType = node.knowledge_source_type ?? node.source_type
  const handleOpen = () => openKnowledgeSource(node, sourceHref)

  if (sourceType === 'media_asset' && node.source_id) {
    return <KnowledgeSourceMediaPreview assetId={node.source_id} name={name} onOpen={handleOpen} />
  }

  const previewProps = resolveKnowledgeSourcePreviewProps(node)
  if (previewProps) {
    return <ArtifactInlinePreviewCard {...previewProps} openPreviewOverride={handleOpen} />
  }

  return null
}
