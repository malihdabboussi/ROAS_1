import {
  openArtifactInShell,
  openArtifactPreviewInShell,
  openDocumentInShell,
} from '@/lib/artifacts'
import { openMediaAssetInApp } from '@/lib/media/open-media-asset-in-app'
import type { FinalOutputBlock } from './message-bubble.utils'

export function openFinalOutputInShell(block: FinalOutputBlock) {
  if (block.type === 'artifact_preview') {
    openArtifactPreviewInShell({
      artifactType: block.artifactType,
      artifactId: block.artifactId,
      name: block.name,
      spaceId: block.spaceId,
      campaignId: block.campaignId,
      internalUrl: block.internalUrl,
    })
    return
  }

  if (block.type === 'document_card') {
    openDocumentInShell({
      documentId: block.documentId?.trim() ?? '',
      title: block.title,
      spaceId: block.spaceId,
      spaceItemId: block.spaceItemId?.trim() ?? '',
    })
    return
  }

  if (block.type === 'media_asset') {
    const kind =
      block.kind === 'video' || block.kind === 'audio' || block.kind === 'image'
        ? block.kind
        : 'image'
    if (
      block.mediaAssetId &&
      openMediaAssetInApp({
        mediaAssetId: block.mediaAssetId,
        title: block.title,
        spaceId: block.spaceId,
        kind,
        fileUrl: block.url,
      })
    ) {
      return
    }
    openArtifactInShell({
      id: block.id,
      mediaAssetId: block.mediaAssetId,
      title: block.title,
      type: kind,
      fileUrl: block.url,
      spaceId: block.spaceId,
      contextLabel: 'Chat',
    })
    return
  }

  if (block.type === 'pdf_file' || block.type === 'docx_file') {
    openArtifactInShell({
      id: block.id,
      title: block.label,
      type: block.type === 'pdf_file' ? 'pdf' : 'file',
      fileUrl: block.url,
      fileName: block.label,
      mimeType:
        block.type === 'pdf_file'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contextLabel: 'Chat',
    })
    return
  }

  if (block.type === 'project_preview') {
    openArtifactInShell({
      id: block.project_id,
      entityId: block.project_id,
      entityTable: 'projects',
      title: block.name,
      type: 'text',
      content: [
        '## Project ready',
        block.entry_point ? `Entry point: ${block.entry_point}` : null,
        Array.isArray(block.files) ? `${block.files.length} files` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      internalUrl: `/projects/${encodeURIComponent(block.project_id)}`,
      contextLabel: 'Chat',
    })
    return
  }

  openArtifactInShell({
    id: block.id,
    title: block.name,
    type: 'text',
    content: `\`\`\`json\n${JSON.stringify(block.widget_definition, null, 2)}\n\`\`\``,
    contextLabel: 'Chat',
  })
}
