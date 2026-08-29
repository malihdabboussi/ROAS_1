type UnknownRow = Record<string, unknown>

export type ConversationFileRow = {
  id: string
  messageId: string
  title: string
  subtitle: string | null
  kind: 'artifact' | 'image' | 'video' | 'audio' | 'file'
  fileUrl: string | null
  mimeType: string | null
  mediaAssetId: string | null
  entityId: string | null
  entityType: string | null
  campaignId: string | null
  internalUrl: string | null
  status: string | null
  spaceId?: string | null
  documentId?: string | null
  spaceItemId?: string | null
  content?: string | null
  createdAt: string
}

function stringField(row: UnknownRow, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function artifactPreviewRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const entityId = stringField(block, 'artifactId')
  const entityType = stringField(block, 'artifactType')
  if (!entityId || !entityType) return null
  return {
    id: stringField(block, 'id') ?? `${messageId}:artifact:${entityId}`,
    messageId,
    title: stringField(block, 'name') ?? 'Artifact',
    subtitle: stringField(block, 'subtitle'),
    kind: 'artifact',
    fileUrl: null,
    mimeType: null,
    mediaAssetId: null,
    entityId,
    entityType,
    campaignId: stringField(block, 'campaignId') ?? stringField(block, 'campaign_id'),
    internalUrl: stringField(block, 'internalUrl') ?? stringField(block, 'internal_url'),
    status: stringField(block, 'status'),
    spaceId: stringField(block, 'spaceId') ?? stringField(block, 'space_id'),
    createdAt,
  }
}

function generatedFileRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const type = stringField(block, 'type')
  const fileUrl = stringField(block, 'url')
  if (!fileUrl || (type !== 'pdf_file' && type !== 'docx_file')) return null
  return {
    id: stringField(block, 'id') ?? `${messageId}:${fileUrl}`,
    messageId,
    title: stringField(block, 'label') ?? 'Document',
    subtitle: null,
    kind: 'file',
    fileUrl,
    mimeType:
      type === 'pdf_file'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mediaAssetId: null,
    entityId: null,
    entityType: null,
    campaignId: null,
    internalUrl: null,
    status: null,
    createdAt,
  }
}

function mediaAssetRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const fileUrl = stringField(block, 'url')
  const kind = stringField(block, 'kind')
  if (!fileUrl || !kind || !['image', 'video', 'audio', 'file'].includes(kind)) return null
  return {
    id: stringField(block, 'id') ?? `${messageId}:${fileUrl}`,
    messageId,
    title: stringField(block, 'title') ?? stringField(block, 'fileName') ?? 'Media',
    subtitle: stringField(block, 'prompt'),
    kind: kind as ConversationFileRow['kind'],
    fileUrl,
    mimeType: stringField(block, 'mimeType'),
    mediaAssetId: stringField(block, 'mediaAssetId'),
    entityId: null,
    entityType: null,
    campaignId: null,
    internalUrl: null,
    status: null,
    spaceId: stringField(block, 'spaceId'),
    createdAt,
  }
}

function documentCardRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const documentId = stringField(block, 'documentId')
  const spaceItemId = stringField(block, 'spaceItemId')
  const entityId = spaceItemId ?? documentId
  if (!entityId) return null
  return {
    id: stringField(block, 'id') ?? `${messageId}:document:${entityId}`,
    messageId,
    title: stringField(block, 'title') ?? 'Document',
    subtitle: stringField(block, 'snippet'),
    kind: 'artifact',
    fileUrl: null,
    mimeType: null,
    mediaAssetId: null,
    entityId,
    entityType: 'document',
    campaignId: null,
    internalUrl: null,
    status: null,
    spaceId: stringField(block, 'spaceId'),
    documentId,
    spaceItemId,
    createdAt,
  }
}

function projectPreviewRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const projectId = stringField(block, 'project_id')
  if (!projectId) return null
  const files = Array.isArray(block.files) ? block.files : []
  const entryPoint = stringField(block, 'entry_point')
  return {
    id: stringField(block, 'id') ?? `${messageId}:project:${projectId}`,
    messageId,
    title: stringField(block, 'name') ?? 'Project',
    subtitle: entryPoint ?? (files.length > 0 ? `${files.length} files` : null),
    kind: 'artifact',
    fileUrl: null,
    mimeType: null,
    mediaAssetId: null,
    entityId: projectId,
    entityType: 'project',
    campaignId: null,
    internalUrl: `/projects/${encodeURIComponent(projectId)}`,
    status: null,
    content: [
      '## Project ready',
      entryPoint ? `Entry point: ${entryPoint}` : null,
      files.length > 0 ? `${files.length} files` : null,
    ]
      .filter(Boolean)
      .join('\n\n'),
    createdAt,
  }
}

function widgetPreviewRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const widgetId = stringField(block, 'id')
  if (!widgetId) return null
  return {
    id: widgetId,
    messageId,
    title: stringField(block, 'name') ?? 'Widget',
    subtitle: null,
    kind: 'artifact',
    fileUrl: null,
    mimeType: null,
    mediaAssetId: null,
    entityId: widgetId,
    entityType: 'widget',
    campaignId: null,
    internalUrl: null,
    status: null,
    content: `\`\`\`json\n${JSON.stringify(block.widget_definition ?? {}, null, 2)}\n\`\`\``,
    createdAt,
  }
}

function browserScreenshotRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const fileUrl = stringField(block, 'imageUrl')
  if (!fileUrl) return null
  const pageUrl = stringField(block, 'pageUrl')
  let title = 'Browser Screenshot'
  if (pageUrl) {
    try {
      title = `Screenshot — ${new URL(pageUrl).hostname}`
    } catch {
      title = 'Browser Screenshot'
    }
  }
  return {
    id: stringField(block, 'id') ?? `${messageId}:screenshot:${fileUrl}`,
    messageId,
    title,
    subtitle: pageUrl,
    kind: 'image',
    fileUrl,
    mimeType: 'image/png',
    mediaAssetId: null,
    entityId: null,
    entityType: null,
    campaignId: null,
    internalUrl: null,
    status: null,
    createdAt,
  }
}

export function conversationOutputRow(
  block: UnknownRow,
  messageId: string,
  createdAt: string,
): ConversationFileRow | null {
  const type = stringField(block, 'type')
  if (type === 'artifact_preview') return artifactPreviewRow(block, messageId, createdAt)
  if (type === 'pdf_file' || type === 'docx_file') {
    return generatedFileRow(block, messageId, createdAt)
  }
  if (type === 'media_asset') return mediaAssetRow(block, messageId, createdAt)
  if (type === 'document_card') return documentCardRow(block, messageId, createdAt)
  if (type === 'project_preview') return projectPreviewRow(block, messageId, createdAt)
  if (type === 'widget_preview') return widgetPreviewRow(block, messageId, createdAt)
  if (type === 'browser_screenshot') return browserScreenshotRow(block, messageId, createdAt)
  return null
}
