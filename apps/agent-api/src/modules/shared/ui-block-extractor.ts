import { DURABLE_ARTIFACT_OUTPUT_DEFINITIONS } from './durable-artifact-output-registry'

export {
  DURABLE_ARTIFACT_OUTPUT_ACTIONS,
  DURABLE_ARTIFACT_OUTPUT_DEFINITIONS,
} from './durable-artifact-output-registry'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function isCampaignToolName(name: string): boolean {
  return name === 'vibey_backend' || name === 'campaign_capability'
}

export function normalizeUiBlocks(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return []

  const now = Date.now()
  const blocks: Array<Record<string, unknown>> = []
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i]
    if (!isRecord(entry)) continue
    if (typeof entry.type !== 'string' || entry.type.trim().length === 0) continue
    blocks.push({
      ...entry,
      id: typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id : `ui-${now}-${i}`,
    })
  }
  return blocks
}

export function extractUiBlocksFromMalformedJson(text: string): Array<Record<string, unknown>> {
  const marker = '"ui_blocks"'
  const idx = text.lastIndexOf(marker)
  if (idx === -1) return []
  const colonIdx = text.indexOf(':', idx + marker.length)
  if (colonIdx === -1) return []
  const bracketIdx = text.indexOf('[', colonIdx)
  if (bracketIdx === -1) return []
  let depth = 0
  let endIdx = -1
  for (let i = bracketIdx; i < text.length; i++) {
    if (text[i] === '[') depth++
    else if (text[i] === ']') {
      depth--
      if (depth === 0) {
        endIdx = i
        break
      }
    }
  }
  if (endIdx === -1) return []
  const fragment = text.slice(bracketIdx, endIdx + 1)
  try {
    const arr = JSON.parse(fragment) as unknown[]
    return normalizeUiBlocks(arr)
  } catch {
    return []
  }
}

/** vibey_backend / plugin often returns `{ content: [{ type: 'text', text: '<json>' }] }` */
export function parseCampaignToolTextEnvelope(result: unknown): Record<string, unknown> | null {
  if (!isRecord(result) || !Array.isArray(result.content)) return null
  for (const item of result.content) {
    if (!isRecord(item) || item.type !== 'text') continue
    const text = typeof item.text === 'string' ? item.text : ''
    if (!text.trim()) continue
    try {
      const parsed = JSON.parse(text) as unknown
      if (isRecord(parsed)) return parsed
    } catch {
      continue
    }
  }
  return null
}

const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
  activecampaign: 'ActiveCampaign',
  active_campaign: 'ActiveCampaign',
  gohighlevel: 'GoHighLevel',
  google_drive: 'Google Drive',
  google_analytics: 'Google Analytics',
  google_calendar: 'Google Calendar',
  google_ads: 'Google Ads',
  google_search_console: 'Google Search Console',
  google_sheets: 'Google Sheets',
  google_docs: 'Google Docs',
  github: 'GitHub',
  tiktok: 'TikTok',
  clickup: 'ClickUp',
  hubspot: 'HubSpot',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  mailchimp: 'Mailchimp',
  scrapecreators: 'Social Analysis',
  social_analysis: 'Social Analysis',
  dataforseo: 'SEO Research',
  seo_research: 'SEO Research',
}

export function integrationDisplayLabel(id: string): string {
  return (
    INTEGRATION_DISPLAY_NAMES[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

function normalizeIntegrationRepairStatus(status: string): string {
  if (
    status === 'needs_reconnect' ||
    status === 'missing_scope' ||
    status === 'access_denied' ||
    status === 'fallback_available' ||
    status === 'disconnected'
  ) {
    return status
  }
  return ''
}

function normalizeIntegrationRepairAction(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  const label = typeof raw.label === 'string' ? raw.label.trim() : ''
  if (!type || !label) return null
  return raw
}

function buildIntegrationConnectBlock(
  integrationId: string,
  description: string,
  status?: string,
  repair?: Record<string, unknown>,
) {
  const label = integrationDisplayLabel(integrationId)
  const normalizedStatus =
    normalizeIntegrationRepairStatus(
      String(repair?.status ?? status ?? '')
        .trim()
        .toLowerCase(),
    ) ||
    (description.toLowerCase().includes('reconnect') ||
    description.toLowerCase().includes('expired')
      ? 'needs_reconnect'
      : 'disconnected')
  const actionType = normalizedStatus === 'needs_reconnect' ? 'reconnect' : 'connect'
  const primaryAction = normalizeIntegrationRepairAction(repair?.primaryAction) ?? {
    type: actionType,
    provider: integrationId,
    label: actionType === 'reconnect' ? `Reconnect ${label}` : `Connect ${label}`,
  }
  const secondaryActionsRaw = Array.isArray(repair?.secondaryActions)
    ? repair.secondaryActions
    : null
  const secondaryActions = secondaryActionsRaw
    ?.map(normalizeIntegrationRepairAction)
    .filter((action): action is Record<string, unknown> => action !== null) ?? [
    {
      type: 'open_settings',
      provider: integrationId,
      label: 'Open settings',
    },
  ]

  return {
    type: 'integration_connect',
    id: `integration-connect-${integrationId}-${Date.now()}`,
    provider: integrationId,
    title:
      typeof repair?.title === 'string' && repair.title.trim().length > 0
        ? repair.title.trim()
        : actionType === 'reconnect'
          ? `Reconnect ${label}`
          : `Connect ${label}`,
    description:
      typeof repair?.description === 'string' && repair.description.trim().length > 0
        ? repair.description.trim()
        : description,
    status: normalizedStatus,
    problem:
      typeof repair?.problem === 'string' && repair.problem.trim().length > 0
        ? repair.problem.trim()
        : description,
    primaryAction,
    secondaryActions,
    ...(isRecord(repair?.doctor) ? { doctor: repair.doctor } : {}),
  }
}

function extractMetaAdAccounts(
  result: unknown,
): Array<{ id: string; name: string; currency?: string }> {
  if (!isRecord(result)) return []
  const raw = result.adAccounts
  if (!Array.isArray(raw)) return []

  const parsed: Array<{ id: string; name: string; currency?: string }> = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = typeof entry.id === 'string' ? entry.id : ''
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!id || !name) continue
    parsed.push({
      id,
      name,
      ...(typeof entry.currency === 'string' ? { currency: entry.currency } : {}),
    })
  }
  return parsed
}

function extractMetaPages(result: unknown): Array<{ id: string; name: string }> {
  if (!isRecord(result)) return []
  const raw = result.pages
  if (!Array.isArray(raw)) return []

  const parsed: Array<{ id: string; name: string }> = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = typeof entry.id === 'string' ? entry.id : ''
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!id || !name) continue
    parsed.push({ id, name })
  }
  return parsed
}

type MediaAssetKind = 'image' | 'video' | 'audio' | 'file'

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function pushRecord(
  records: Array<Record<string, unknown>>,
  seen: Set<Record<string, unknown>>,
  value: unknown,
): void {
  if (!isRecord(value) || seen.has(value)) return
  seen.add(value)
  records.push(value)
}

function collectCandidateRecords(result: unknown): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = []
  const seen = new Set<Record<string, unknown>>()
  const envelope = parseCampaignToolTextEnvelope(result)
  pushRecord(records, seen, envelope ?? result)

  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (!record) continue
    for (const key of [
      'result',
      'data',
      'draft',
      'asset',
      'asset_ref',
      'media',
      'media_asset',
      'document',
      'offer',
      'avatar',
      'presentation',
      'sequence',
      'email',
      'social_post',
      'socialPost',
      'blog_post',
      'blogPost',
      'campaign',
      'canvas',
      'form',
      'task',
      'item',
      'mission',
      'flow',
      'automation',
      'theme',
      'object',
      'object_type',
      'record',
      'project',
      'website',
      'funnel',
      'ad_set',
      'adSet',
    ]) {
      pushRecord(records, seen, record[key])
    }
  }

  return records
}

function firstString(records: Array<Record<string, unknown> | undefined>, keys: string[]): string {
  for (const record of records) {
    if (!record) continue
    for (const key of keys) {
      const value = stringValue(record[key])
      if (value) return value
    }
  }
  return ''
}

function firstStringByKeyPriority(
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): string {
  for (const key of keys) {
    for (const record of records) {
      if (!record) continue
      const value = stringValue(record[key])
      if (value) return value
    }
  }
  return ''
}

const MEDIA_ASSET_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function firstUuid(records: Array<Record<string, unknown> | undefined>, keys: string[]): string {
  for (const record of records) {
    if (!record) continue
    for (const key of keys) {
      const value = stringValue(record[key])
      if (value && MEDIA_ASSET_UUID_RE.test(value)) return value
    }
  }
  return ''
}

function inferMediaKind(
  defaultKind: MediaAssetKind,
  mimeType: string,
  url: string,
): MediaAssetKind {
  const mime = mimeType.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'

  const lowerUrl = url.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/.test(lowerUrl)) return 'image'
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/.test(lowerUrl)) return 'video'
  if (/\.(mp3|wav|ogg|aac|m4a)(\?|#|$)/.test(lowerUrl)) return 'audio'
  return defaultKind
}

function buildMediaAssetBlock(input: {
  action: string
  data: Record<string, unknown>
  result: unknown
  defaultKind: MediaAssetKind
  defaultTitle: string
  urlKeys?: string[]
}): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(input.result), input.data]
  const url = firstString(records, [
    ...(input.urlKeys ?? []),
    'url',
    'file_url',
    'public_url',
    'signed_url',
    'image_url',
    'video_url',
    'audio_url',
    'result_url',
  ])
  if (!url) return []

  const mediaAssetId = firstUuid(records, [
    'media_asset_id',
    'mediaAssetId',
    'image_asset_id',
    'video_asset_id',
    'asset_id',
    'id',
  ])
  const spaceId = firstUuid(records, ['space_id', 'spaceId'])
  const mimeType = firstString(records, ['mime_type', 'mimeType', 'content_type', 'contentType'])
  const title =
    firstString(records, [
      'title',
      'name',
      'file_name',
      'filename',
      'original_filename',
      'label',
    ]) || input.defaultTitle
  const fileName = firstString(records, ['file_name', 'filename', 'original_filename'])
  const prompt = firstString(records, ['prompt', 'source_prompt'])
  const kind = inferMediaKind(input.defaultKind, mimeType, url)

  return [
    {
      type: 'media_asset',
      id: mediaAssetId ? `media-${mediaAssetId}` : `media-${input.action}-${Date.now()}`,
      url,
      title,
      kind,
      ...(mediaAssetId ? { mediaAssetId } : {}),
      ...(spaceId ? { spaceId } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(fileName ? { fileName } : {}),
      ...(prompt ? { prompt } : {}),
    },
  ]
}

function buildRegisteredImageBlocks(
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const envelope = parseCampaignToolTextEnvelope(result)
  const payload = envelope ?? (isRecord(result) ? result : null)
  if (
    !payload ||
    payload.operation !== 'render_validate_messaging' ||
    !Array.isArray(payload.media_assets)
  ) {
    return []
  }
  const requestedInputs = Array.isArray(data.inputs) ? data.inputs : []
  const spaceId = firstString([payload, data], ['space_id', 'spaceId'])

  return payload.media_assets.flatMap((entry, index) => {
    if (!isRecord(entry)) return []
    const url = firstString([entry], ['url', 'public_url', 'signed_url'])
    if (!url) return []
    const requested = isRecord(requestedInputs[index]) ? requestedInputs[index] : undefined
    const mediaAssetId = firstUuid([entry], ['media_asset_id', 'mediaAssetId', 'id'])
    const title =
      firstString([entry, requested], ['name', 'title']) || `Rendered image ${index + 1}`
    const prompt = firstString([requested, entry], ['source_prompt', 'prompt'])
    return [
      {
        type: 'media_asset',
        id: mediaAssetId ? `media-${mediaAssetId}` : `media-process-media-${index}`,
        url,
        title,
        kind: 'image',
        ...(mediaAssetId ? { mediaAssetId } : {}),
        ...(spaceId ? { spaceId } : {}),
        ...(prompt ? { prompt } : {}),
      },
    ]
  })
}

function buildArtifactPreviewBlock(input: {
  artifactType: string
  result: unknown
  data: Record<string, unknown>
  idKeys: string[]
  nameKeys: string[]
  defaultName: string
  status?: string
}): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(input.result), input.data]
  const artifactId = firstStringByKeyPriority(records, input.idKeys)
  if (!artifactId) return []
  const name = firstString(records, input.nameKeys) || input.defaultName
  const subtitle = firstString(records, ['subtitle', 'summary', 'description'])
  const imageUrl = firstString(records, ['image_url', 'imageUrl', 'cover_url', 'icon_image_url'])
  const videoUrl = firstString(records, ['video_url', 'videoUrl'])
  const spaceId = firstString(records, ['space_id', 'spaceId'])
  const status = input.status ?? firstString(records, ['status'])

  return [
    {
      type: 'artifact_preview',
      id: `artifact-${input.artifactType}-${artifactId}`,
      artifactType: input.artifactType,
      artifactId,
      name,
      ...(spaceId ? { spaceId } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(videoUrl ? { videoUrl } : {}),
      ...(status ? { status } : {}),
    },
  ]
}

function buildRegisteredArtifactOutputBlock(
  action: string,
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const definition = DURABLE_ARTIFACT_OUTPUT_DEFINITIONS.find((candidate) =>
    candidate.actions.includes(action),
  )
  if (!definition) return []
  const records = [...collectCandidateRecords(result), data]
  const resultStatus = firstString(records, ['status'])
  const fallbackStatus = /^(create|generate|define|extract)_/.test(action) ? 'created' : 'updated'
  return buildArtifactPreviewBlock({
    artifactType: definition.artifactType,
    result,
    data,
    idKeys: definition.idKeys,
    nameKeys: definition.nameKeys,
    defaultName: definition.defaultName,
    status:
      action === 'create_campaign' ? resultStatus || 'draft' : resultStatus || fallbackStatus,
  })
}

function buildProjectPreviewBlock(
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(result), data]
  const projectId = firstStringByKeyPriority(records, ['project_id', 'projectId', 'id'])
  if (!projectId) return []
  const filesRecord = records.find((record) => Array.isArray(record.files))
  return [
    {
      type: 'project_preview',
      id: `project-${projectId}`,
      project_id: projectId,
      name: firstString(records, ['name', 'title']) || 'Project',
      entry_point: firstString(records, ['entry_point', 'entryPoint']) || undefined,
      ...(filesRecord ? { files: filesRecord.files } : {}),
    },
  ]
}

function buildDocumentOutputBlock(
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(result), data]
  const documentId = firstStringByKeyPriority(records, [
    'document_id',
    'documentId',
    'conversation_document_id',
    'space_item_id',
    'item_id',
    'id',
  ])
  if (!documentId) return []
  const spaceId = firstStringByKeyPriority(records, ['space_id', 'spaceId'])
  const spaceItemId = firstStringByKeyPriority(records, ['space_item_id', 'spaceItemId'])
  return [
    {
      type: 'document_card',
      id: `document-${documentId}`,
      title: firstString(records, ['title', 'name']) || 'Document',
      documentId,
      snippet: firstString(records, ['snippet', 'summary', 'description', 'content']),
      ...(spaceId ? { spaceId } : {}),
      ...(spaceItemId ? { spaceItemId } : {}),
    },
  ]
}

function buildCanvasOutputBlock(
  action: string,
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(result), data]
  const boardId = firstStringByKeyPriority(records, ['board_id', 'boardId'])
  const campaignId = firstStringByKeyPriority(records, ['campaign_id', 'campaignId'])
  if (!boardId || !campaignId) return []
  const campaignLabel = firstString(records, ['campaign_label', 'campaignLabel'])
  const subtitle =
    action === 'build_campaign_blueprint'
      ? 'Campaign blueprint updated'
      : action === 'complete_canvas_placeholder'
        ? 'Canvas asset updated'
        : 'Canvas updated'

  return [
    {
      type: 'artifact_preview',
      id: `artifact-canvas-${boardId}`,
      artifactType: 'canvas',
      artifactId: boardId,
      campaignId,
      internalUrl: `/campaigns/${encodeURIComponent(campaignId)}?view=canvas`,
      name: campaignLabel ? `${campaignLabel} Canvas` : 'Campaign Canvas',
      subtitle,
      status: 'updated',
    },
  ]
}

function buildGeneratedFileOutputBlock(
  action: string,
  result: unknown,
): Array<Record<string, unknown>> {
  if ((action !== 'create_pdf' && action !== 'create_docx') || !isRecord(result)) return []
  if (result.success === false) return []
  const fileUrl = stringValue(result.file_url)
  const fileName = stringValue(result.file_name)
  const document = isRecord(result.document) ? result.document : null
  const documentId = document ? stringValue(document.id) : ''
  const extension = action === 'create_docx' ? 'docx' : 'pdf'
  const defaultTitle = action === 'create_docx' ? 'DOCX' : 'PDF'
  const title =
    (document ? stringValue(document.title) : '') ||
    stringValue(result.title) ||
    (fileName ? fileName.replace(new RegExp(`\\.${extension}$`, 'i'), '') : '') ||
    defaultTitle
  if (documentId) {
    return [
      {
        type: 'document_card',
        id: `document-${documentId}`,
        title,
        documentId,
        snippet: defaultTitle,
      },
    ]
  }
  if (!fileUrl) return []
  return [
    {
      type: action === 'create_docx' ? 'docx_file' : 'pdf_file',
      id: `${extension}-file-${Date.now()}`,
      url: fileUrl,
      label: fileName || `${title}.${extension}`,
    },
  ]
}

function buildBrowserScreenshotBlock(result: unknown): Array<Record<string, unknown>> {
  const browserResult = isRecord(result) ? result : null
  const details = browserResult && isRecord(browserResult.details) ? browserResult.details : null
  const screenshotPath =
    stringValue(browserResult?.path) ||
    stringValue(browserResult?.imagePath) ||
    stringValue(details?.path) ||
    stringValue(details?.imagePath)
  if (!screenshotPath) return []
  const filename = screenshotPath.split('/').pop() ?? ''
  if (!filename) return []
  const pageUrl = stringValue(browserResult?.url) || stringValue(details?.url) || undefined
  return [
    {
      type: 'browser_screenshot',
      id: `browser-screenshot-${Date.now()}`,
      imageUrl: `/api/chat/browser-media/${encodeURIComponent(filename)}`,
      pageUrl,
    },
  ]
}

/** Service Request drafts from The ROAS Portal MCP → continue in chat, not a form. */
function buildWorkRequestChatBlock(
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const envelope = parseCampaignToolTextEnvelope(result)
  const records = [...(envelope ? [envelope] : []), ...collectCandidateRecords(result), data]
  const nestedDraft = records
    .map((record) => (isRecord(record.draft) ? record.draft : null))
    .find(Boolean)
  if (nestedDraft) records.unshift(nestedDraft)

  let reviewUrl = firstString(records, ['review_url', 'reviewUrl'])
  if (!reviewUrl) {
    for (const record of records) {
      if (!record) continue
      for (const value of Object.values(record)) {
        if (typeof value !== 'string' || !value.includes('/request-review/')) continue
        const match = value.match(/https?:\/\/[^\s"]+\/request-review\/[A-Za-z0-9_-]{20,}/)
        if (match?.[0]) {
          reviewUrl = match[0]
          break
        }
      }
      if (reviewUrl) break
    }
  }
  if (!reviewUrl || !/^https?:\/\//i.test(reviewUrl)) return []
  if (!reviewUrl.includes('/request-review/')) return []

  const draftId = firstString(records, ['draft_id', 'draftId', 'id'])
  const title =
    firstString(records, ['title', 'name']) ||
    (typeof data.tool_name === 'string' && data.tool_name.includes('fulfillment')
      ? 'Service Request ready'
      : typeof data.tool === 'string' && data.tool.includes('fulfillment')
        ? 'Service Request ready'
        : 'Service Request ready')

  return [
    {
      type: 'work_request',
      id: draftId ? `work-request-${draftId}` : `work-request-${Date.now()}`,
      title,
      reviewUrl,
      ...(draftId ? { draftId } : {}),
      status: 'pending',
    },
  ]
}

function buildActionOutputBlocks(
  action: string,
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  if (action === 'generate_image' || action === 'edit_image') {
    return buildMediaAssetBlock({
      action,
      data,
      result,
      defaultKind: 'image',
      defaultTitle: action === 'edit_image' ? 'Edited image' : 'Generated image',
      urlKeys: ['image_url'],
    })
  }
  if (action === 'generate_video' || action === 'get_video_status') {
    return buildMediaAssetBlock({
      action,
      data,
      result,
      defaultKind: 'video',
      defaultTitle: 'Generated video',
      urlKeys: ['video_url'],
    })
  }
  if (action === 'process_media') {
    const registeredImages = buildRegisteredImageBlocks(result, data)
    if (registeredImages.length > 0) return registeredImages
    return buildMediaAssetBlock({
      action,
      data,
      result,
      defaultKind: 'file',
      defaultTitle: 'Processed media',
    })
  }
  if (action === 'create_pdf' || action === 'create_docx') {
    return buildGeneratedFileOutputBlock(action, result)
  }
  if (
    action === 'create_project' ||
    action === 'create_file' ||
    action === 'update_file' ||
    action === 'patch_file' ||
    action === 'update_project_deps' ||
    action === 'import_github_repo'
  ) {
    return buildProjectPreviewBlock(result, data)
  }
  if (action === 'save_document' || action === 'update_document') {
    return buildDocumentOutputBlock(result, data)
  }
  if (
    action === 'build_campaign_blueprint' ||
    action === 'apply_canvas_operations' ||
    action === 'complete_canvas_placeholder'
  ) {
    return buildCanvasOutputBlock(action, result, data)
  }

  const registeredArtifactBlock = buildRegisteredArtifactOutputBlock(action, result, data)
  if (registeredArtifactBlock.length > 0) return registeredArtifactBlock

  return []
}

const DURABLE_OUTPUT_BLOCK_TYPES = new Set([
  'artifact_preview',
  'browser_screenshot',
  'document_card',
  'docx_file',
  'media_asset',
  'pdf_file',
  'project_preview',
])

function withActionOutputReceipt(input: {
  blocks: Array<Record<string, unknown>>
  name: string
  action?: string
  toolArgs?: Record<string, unknown>
  result: unknown
}): Array<Record<string, unknown>> {
  if (input.name === 'browser') {
    if (input.blocks.some((block) => stringValue(block.type) === 'browser_screenshot')) {
      return input.blocks
    }
    const screenshotBlocks = buildBrowserScreenshotBlock(input.result)
    return screenshotBlocks.length > 0 ? [...input.blocks, ...screenshotBlocks] : input.blocks
  }
  if (!isCampaignToolName(input.name) || !input.action) return input.blocks
  if (input.blocks.some((block) => DURABLE_OUTPUT_BLOCK_TYPES.has(stringValue(block.type)))) {
    return input.blocks
  }
  const data = isRecord(input.toolArgs?.data)
    ? (input.toolArgs.data as Record<string, unknown>)
    : {}
  const outputBlocks = buildActionOutputBlocks(input.action, input.result, data)
  return outputBlocks.length > 0 ? [...input.blocks, ...outputBlocks] : input.blocks
}

export function resolveUiBlocksFromToolResult(params: {
  name: string
  action?: string
  toolArgs?: Record<string, unknown>
  result?: unknown
  status: 'completed' | 'failed'
  cachedMetaAdAccounts: Array<{ id: string; name: string; currency?: string }>
  cachedMetaPages: Array<{
    id: string
    name: string
    instagram_business_account?: { id: string; username?: string }
  }>
}): Array<Record<string, unknown>> {
  const { name, action, toolArgs, result, status, cachedMetaAdAccounts, cachedMetaPages } = params
  if (status !== 'completed') return []

  if (isRecord(result)) {
    const genericBlocks = normalizeUiBlocks(result.ui_blocks)
    if (genericBlocks.length > 0) {
      return withActionOutputReceipt({ blocks: genericBlocks, name, action, toolArgs, result })
    }
    if (isRecord(result.result)) {
      const nestedResultBlocks = normalizeUiBlocks(
        (result.result as Record<string, unknown>).ui_blocks,
      )
      if (nestedResultBlocks.length > 0) {
        return withActionOutputReceipt({
          blocks: nestedResultBlocks,
          name,
          action,
          toolArgs,
          result,
        })
      }
    }
    if (isRecord(result.data)) {
      const nestedDataBlocks = normalizeUiBlocks((result.data as Record<string, unknown>).ui_blocks)
      if (nestedDataBlocks.length > 0) {
        return withActionOutputReceipt({ blocks: nestedDataBlocks, name, action, toolArgs, result })
      }
    }

    if (isCampaignToolName(name) && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (!isRecord(item) || item.type !== 'text') continue
        const text = typeof item.text === 'string' ? item.text : ''
        if (!text.trim()) continue
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(text) as Record<string, unknown>
        } catch {
          const uiBlocksFallback = extractUiBlocksFromMalformedJson(text)
          if (uiBlocksFallback.length > 0) {
            return withActionOutputReceipt({
              blocks: uiBlocksFallback,
              name,
              action,
              toolArgs,
              result,
            })
          }
          continue
        }
        if (parsed && Array.isArray(parsed.ui_blocks)) {
          const blocks = normalizeUiBlocks(parsed.ui_blocks)
          if (blocks.length > 0) {
            return withActionOutputReceipt({ blocks, name, action, toolArgs, result })
          }
        }
        if (
          parsed &&
          isRecord(parsed.result) &&
          Array.isArray((parsed.result as Record<string, unknown>).ui_blocks)
        ) {
          const blocks = normalizeUiBlocks((parsed.result as Record<string, unknown>).ui_blocks)
          if (blocks.length > 0) {
            return withActionOutputReceipt({ blocks, name, action, toolArgs, result })
          }
        }
        if (
          parsed &&
          isRecord(parsed.data) &&
          Array.isArray((parsed.data as Record<string, unknown>).ui_blocks)
        ) {
          const blocks = normalizeUiBlocks((parsed.data as Record<string, unknown>).ui_blocks)
          if (blocks.length > 0) {
            return withActionOutputReceipt({ blocks, name, action, toolArgs, result })
          }
        }
      }
    }
  }

  if (name === 'browser' && status === 'completed') {
    const screenshotBlocks = buildBrowserScreenshotBlock(result)
    if (screenshotBlocks.length > 0) return screenshotBlocks
  }

  if (!isCampaignToolName(name) || !action) return []
  const data = isRecord(toolArgs?.data) ? (toolArgs.data as Record<string, unknown>) : {}

  const actionOutputBlocks = buildActionOutputBlocks(action, result, data)
  if (actionOutputBlocks.length > 0) return actionOutputBlocks

  if (action === 'check_integration_connection') {
    const envelope = parseCampaignToolTextEnvelope(result)
    const payload = envelope ?? (isRecord(result) ? result : {})
    const connected = Boolean(payload.connected)
    const integrationIdRaw =
      typeof payload.integration_id === 'string'
        ? payload.integration_id
        : typeof data.integration_id === 'string'
          ? data.integration_id
          : typeof data.service === 'string'
            ? data.service
            : 'unknown'
    const integrationId = integrationIdRaw.trim().toLowerCase()

    if (connected) return []
    if (integrationId === 'unknown' || integrationId === '') return []
    const label = integrationDisplayLabel(integrationId)
    const repair = isRecord(payload.repair) ? payload.repair : undefined
    const statusMessage =
      typeof payload.status === 'string' && payload.status.trim().length > 0
        ? `Current status: ${payload.status.trim()}.`
        : ''
    return [
      buildIntegrationConnectBlock(
        integrationId,
        `${label} needs attention. ${statusMessage}`.trim(),
        typeof payload.status === 'string' ? payload.status : undefined,
        repair,
      ),
    ]
  }

  if (action === 'check_meta_connection') {
    const connected = isRecord(result) ? Boolean(result.connected) : false
    if (connected) {
      const resultAdAccounts = extractMetaAdAccounts(result)
      const resultPages = extractMetaPages(result)
      const adAccounts = resultAdAccounts.length > 0 ? resultAdAccounts : cachedMetaAdAccounts
      const pages = resultPages.length > 0 ? resultPages : cachedMetaPages
      if (adAccounts.length === 0 && pages.length === 0) return []
      return [
        {
          type: 'meta_ad_accounts',
          id: `meta-accounts-${Date.now()}`,
          adAccounts,
          pages,
          ...(typeof data.ad_id === 'string' ? { adId: data.ad_id } : {}),
          ...(typeof data.campaign_name === 'string' ? { campaignName: data.campaign_name } : {}),
          ...(typeof data.headline === 'string' ? { headline: data.headline } : {}),
          ...(typeof data.primary_text === 'string' ? { primaryText: data.primary_text } : {}),
          ...(typeof data.image_url === 'string' ? { imageUrl: data.image_url } : {}),
        },
      ]
    }
    return [
      buildIntegrationConnectBlock('meta', 'Connect Meta to continue publishing ads from chat.'),
    ]
  }

  if (action === 'list_meta_ad_accounts' || action === 'list_meta_pages') {
    return [
      {
        type: 'meta_ad_accounts',
        id: `meta-accounts-${Date.now()}`,
        adAccounts: cachedMetaAdAccounts,
        pages: cachedMetaPages,
        ...(typeof data.ad_id === 'string' ? { adId: data.ad_id } : {}),
        ...(typeof data.campaign_name === 'string' ? { campaignName: data.campaign_name } : {}),
        ...(typeof data.headline === 'string' ? { headline: data.headline } : {}),
        ...(typeof data.primary_text === 'string' ? { primaryText: data.primary_text } : {}),
        ...(typeof data.image_url === 'string' ? { imageUrl: data.image_url } : {}),
      },
    ]
  }

  if (action === 'publish_ad_to_meta' && isRecord(result)) {
    const metaAdId = typeof result.meta_ad_id === 'string' ? result.meta_ad_id : ''
    if (!metaAdId) return []
    return [
      {
        type: 'meta_status',
        id: `meta-status-${Date.now()}`,
        metaAdId,
        status: 'PAUSED',
        campaignId:
          typeof result.meta_campaign_id === 'string' ? result.meta_campaign_id : undefined,
      },
    ]
  }

  if (action === 'get_meta_ad_status' && isRecord(result)) {
    const metaAdId = typeof result.id === 'string' ? result.id : ''
    if (!metaAdId) return []
    return [
      {
        type: 'meta_status',
        id: `meta-status-${Date.now()}`,
        metaAdId,
        status:
          typeof result.effective_status === 'string'
            ? result.effective_status
            : typeof result.configured_status === 'string'
              ? result.configured_status
              : 'UNKNOWN',
      },
    ]
  }

  if (action === 'ask_clarification' || action === 'create_flow_clarification') {
    let parsed: Record<string, unknown> | null = null
    let renderMode: string | null = null
    if (isRecord(result) && isRecord(result.clarification)) {
      parsed = result.clarification as Record<string, unknown>
      renderMode = typeof result.render_mode === 'string' ? result.render_mode : null
    }
    if (!parsed) {
      let textPayload: string | null = null
      if (typeof result === 'string') {
        textPayload = result
      } else if (isRecord(result) && Array.isArray(result.content)) {
        const firstText = (result.content as Array<Record<string, unknown>>).find(
          (c) => c.type === 'text' && typeof c.text === 'string',
        )
        if (firstText) textPayload = firstText.text as string
      }
      if (textPayload) {
        try {
          const j = JSON.parse(textPayload) as Record<string, unknown>
          if (isRecord(j?.clarification)) {
            parsed = j.clarification as Record<string, unknown>
            renderMode = typeof j.render_mode === 'string' ? j.render_mode : null
          }
        } catch {}
      }
    }
    if (action === 'create_flow_clarification' && renderMode === 'tab') return []
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return [
        {
          type: 'clarification',
          id: `clarification-${Date.now()}`,
          source: action === 'create_flow_clarification' ? 'flow' : 'ask_clarification',
          title: typeof parsed.title === 'string' ? parsed.title : 'Quick question',
          introMessage: typeof parsed.introMessage === 'string' ? parsed.introMessage : undefined,
          questions: parsed.questions,
          status: 'pending',
        },
      ]
    }
  }

  if (action === 'use_mcp_tool') {
    const workRequestBlock = buildWorkRequestChatBlock(result, data)
    if (workRequestBlock.length > 0) return workRequestBlock
  }

  // Fulfillment creates sometimes land as nested MCP envelopes without a clean
  // top-level review_url key — still emit the resume card when the tool name matches.
  const mcpToolName =
    (typeof data.tool_name === 'string' && data.tool_name) ||
    (typeof data.tool === 'string' && data.tool) ||
    ''
  if (
    /create_fulfillment_request|create_campaign_draft|create_portal_campaign/i.test(mcpToolName)
  ) {
    const workRequestBlock = buildWorkRequestChatBlock(result, data)
    if (workRequestBlock.length > 0) return workRequestBlock
  }

  if (action === 'create_chat_plan' || action === 'update_chat_plan') {
    const planKey = action === 'create_chat_plan' ? 'chat_plan' : 'chat_plan_update'
    let parsed: Record<string, unknown> | null = null
    if (isRecord(result) && isRecord(result[planKey])) {
      parsed = result[planKey] as Record<string, unknown>
    }
    if (!parsed) {
      let textPayload: string | null = null
      if (typeof result === 'string') {
        textPayload = result
      } else if (isRecord(result) && Array.isArray(result.content)) {
        const firstText = (result.content as Array<Record<string, unknown>>).find(
          (c) => c.type === 'text' && typeof c.text === 'string',
        )
        if (firstText) textPayload = firstText.text as string
      }
      if (textPayload) {
        try {
          const j = JSON.parse(textPayload) as Record<string, unknown>
          if (isRecord(j?.[planKey])) parsed = j[planKey] as Record<string, unknown>
        } catch {}
      }
    }
    if (parsed && typeof parsed.plan_id === 'string' && Array.isArray(parsed.items)) {
      return [
        {
          type: 'chat_plan',
          id: `chat-plan-${Date.now()}`,
          plan_id: parsed.plan_id,
          title: typeof parsed.title === 'string' ? parsed.title : 'Plan',
          summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
          items: parsed.items,
          plan_status: typeof parsed.plan_status === 'string' ? parsed.plan_status : 'active',
          version: typeof parsed.version === 'number' ? parsed.version : 1,
        },
      ]
    }
  }

  return []
}
