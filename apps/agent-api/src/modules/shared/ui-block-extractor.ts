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
      'asset',
      'asset_ref',
      'media',
      'media_asset',
      'document',
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
  const artifactId = firstString(records, input.idKeys)
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

function buildProjectPreviewBlock(
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const records = [...collectCandidateRecords(result), data]
  const projectId = firstString(records, ['project_id', 'projectId', 'id'])
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

function buildActionOutputBlocks(
  action: string,
  result: unknown,
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
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
  if (action === 'create_project') return buildProjectPreviewBlock(result, data)

  if (action === 'create_form' || action === 'publish_form' || action === 'attach_form_asset') {
    return buildArtifactPreviewBlock({
      artifactType: 'form',
      result,
      data,
      idKeys: ['form_id', 'formId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Form',
    })
  }
  if (action === 'create_task') {
    return buildArtifactPreviewBlock({
      artifactType: 'task',
      result,
      data,
      idKeys: ['task_id', 'item_id', 'taskId', 'itemId', 'id'],
      nameKeys: ['title', 'name'],
      defaultName: 'Task',
    })
  }
  if (action === 'create_mission') {
    return buildArtifactPreviewBlock({
      artifactType: 'mission',
      result,
      data,
      idKeys: ['mission_id', 'missionId', 'id'],
      nameKeys: ['title', 'name'],
      defaultName: 'Mission',
    })
  }
  if (action === 'create_flow_draft' || action === 'publish_flow') {
    return buildArtifactPreviewBlock({
      artifactType: 'flow',
      result,
      data,
      idKeys: ['automation_id', 'flow_id', 'automationId', 'flowId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Flow',
      status: action === 'create_flow_draft' ? 'draft' : undefined,
    })
  }
  if (action === 'create_website') {
    return buildArtifactPreviewBlock({
      artifactType: 'website',
      result,
      data,
      idKeys: ['website_id', 'funnel_id', 'websiteId', 'funnelId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Website',
    })
  }
  if (action === 'create_funnel') {
    return buildArtifactPreviewBlock({
      artifactType: 'funnel',
      result,
      data,
      idKeys: ['funnel_id', 'funnelId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Funnel',
    })
  }
  if (action === 'create_theme' || action === 'extract_website_theme') {
    return buildArtifactPreviewBlock({
      artifactType: 'theme',
      result,
      data,
      idKeys: ['theme_id', 'themeId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Theme',
    })
  }
  if (action === 'create_object' || action === 'define_object_type') {
    return buildArtifactPreviewBlock({
      artifactType: 'custom-object',
      result,
      data,
      idKeys: ['object_id', 'object_type_id', 'record_id', 'slug', 'id'],
      nameKeys: ['title', 'name', 'slug'],
      defaultName: action === 'define_object_type' ? 'Object type' : 'Object',
    })
  }
  if (action === 'create_ad_set') {
    return buildArtifactPreviewBlock({
      artifactType: 'ad-set',
      result,
      data,
      idKeys: ['ad_set_id', 'adSetId', 'id'],
      nameKeys: ['name', 'title'],
      defaultName: 'Ad Set',
    })
  }
  if (action === 'generate_visual_html') {
    return buildArtifactPreviewBlock({
      artifactType: 'visual-doc',
      result,
      data,
      idKeys: ['space_item_id', 'item_id', 'document_id', 'spaceItemId', 'itemId', 'id'],
      nameKeys: ['title', 'name'],
      defaultName: 'Visual Doc',
    })
  }

  return []
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
    if (genericBlocks.length > 0) return genericBlocks
    if (isRecord(result.result)) {
      const nestedResultBlocks = normalizeUiBlocks(
        (result.result as Record<string, unknown>).ui_blocks,
      )
      if (nestedResultBlocks.length > 0) return nestedResultBlocks
    }
    if (isRecord(result.data)) {
      const nestedDataBlocks = normalizeUiBlocks((result.data as Record<string, unknown>).ui_blocks)
      if (nestedDataBlocks.length > 0) return nestedDataBlocks
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
          if (uiBlocksFallback.length > 0) return uiBlocksFallback
          continue
        }
        if (parsed && Array.isArray(parsed.ui_blocks)) {
          const blocks = normalizeUiBlocks(parsed.ui_blocks)
          if (blocks.length > 0) return blocks
        }
        if (
          parsed &&
          isRecord(parsed.result) &&
          Array.isArray((parsed.result as Record<string, unknown>).ui_blocks)
        ) {
          const blocks = normalizeUiBlocks((parsed.result as Record<string, unknown>).ui_blocks)
          if (blocks.length > 0) return blocks
        }
        if (
          parsed &&
          isRecord(parsed.data) &&
          Array.isArray((parsed.data as Record<string, unknown>).ui_blocks)
        ) {
          const blocks = normalizeUiBlocks((parsed.data as Record<string, unknown>).ui_blocks)
          if (blocks.length > 0) return blocks
        }
      }
    }
  }

  if (name === 'browser' && status === 'completed') {
    const browserResult = isRecord(result) ? result : null
    const details = browserResult && isRecord(browserResult.details) ? browserResult.details : null
    const screenshotPath =
      typeof browserResult?.path === 'string'
        ? browserResult.path
        : typeof browserResult?.imagePath === 'string'
          ? browserResult.imagePath
          : typeof details?.path === 'string'
            ? details.path
            : typeof details?.imagePath === 'string'
              ? details.imagePath
              : null
    const pageUrlFromResult =
      typeof browserResult?.url === 'string'
        ? browserResult.url
        : typeof details?.url === 'string'
          ? details.url
          : undefined
    if (screenshotPath) {
      const filename = screenshotPath.split('/').pop() ?? ''
      if (filename) {
        return [
          {
            type: 'browser_screenshot',
            id: `browser-screenshot-${Date.now()}`,
            imageUrl: `/api/chat/browser-media/${encodeURIComponent(filename)}`,
            pageUrl: pageUrlFromResult,
          },
        ]
      }
    }
  }

  if (!isCampaignToolName(name) || !action) return []
  const data = isRecord(toolArgs?.data) ? (toolArgs.data as Record<string, unknown>) : {}

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

  if (
    (action === 'create_pdf' || action === 'create_docx') &&
    isRecord(result) &&
    result.success !== false
  ) {
    const fileUrl = typeof result.file_url === 'string' ? result.file_url.trim() : ''
    const fileName = typeof result.file_name === 'string' ? result.file_name.trim() : ''
    const doc = isRecord(result.document) ? result.document : null
    const documentId = doc && typeof doc.id === 'string' ? doc.id : ''
    const extension = action === 'create_docx' ? 'docx' : 'pdf'
    const defaultTitle = action === 'create_docx' ? 'DOCX' : 'PDF'
    const title =
      (doc && typeof doc.title === 'string' && doc.title.trim().length > 0
        ? doc.title.trim()
        : null) ??
      (typeof result.title === 'string' && result.title.trim().length > 0
        ? result.title.trim()
        : null) ??
      (fileName ? fileName.replace(new RegExp(`\\.${extension}$`, 'i'), '') : null) ??
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
    if (fileUrl) {
      return [
        {
          type: action === 'create_docx' ? 'docx_file' : 'pdf_file',
          id: `${extension}-file-${Date.now()}`,
          url: fileUrl,
          label: fileName || `${title}.${extension}`,
        },
      ]
    }
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
