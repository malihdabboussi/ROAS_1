export type NormalizedActionData = {
  data: Record<string, unknown>
  normalizedKeys: Array<{ from: string; to: string }>
  conflicts: Array<{ from: string; to: string }>
}

const ACTION_ALIASES: Record<string, Record<string, string>> = {
  ask_agent: {
    agent_key: 'target_agent_key',
  },
  delegate_to_agent: {
    agent_key: 'target_agent_key',
    task: 'task_description',
  },
  get_integration: {
    integration_id: 'service',
  },
  read_document: {
    document_id: 'asset_id',
  },
  get_document: {
    asset_id: 'document_id',
    item_id: 'document_id',
  },
  update_document: {
    asset_id: 'document_id',
    item_id: 'document_id',
  },
  list_documents: {
    query: 'search',
  },
  analyze_video: {
    audio_url: 'media_url',
    url: 'media_url',
    video_url: 'media_url',
  },
  transcribe_audio: {
    audio_url: 'media_url',
    url: 'media_url',
    video_url: 'media_url',
  },
  analyze_image: {
    asset: 'asset_id',
    image: 'image_url',
    media_asset: 'asset_id',
    media_asset_id: 'asset_id',
    url: 'image_url',
  },
  update_presentation: {
    title: 'name',
  },
  use_integration: {
    action: 'integration_action',
    integration_id: 'service',
  },
  use_mcp_tool: {
    tool: 'tool_name',
    args: 'arguments',
  },
  add_mcp_server: {
    server_url: 'url',
  },
  update_contact: {
    confirm_replace_arrays: 'confirm_replace_arrays',
  },
  add_contact_note: {
    id: 'contact_id',
    card_tint: 'card_tint',
  },
  update_contact_note: {
    id: 'contact_id',
    card_tint: 'card_tint',
  },
}

function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

function valuesMatch(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function assetRefRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function assetRefAssetId(value: unknown): string | undefined {
  return isRecord(value) ? stringValue(value.asset_id) : undefined
}

function assetRefUrl(value: unknown): string | undefined {
  return isRecord(value) ? stringValue(value.url) : undefined
}

function setDerivedValue(
  normalized: Record<string, unknown>,
  normalizedKeys: Array<{ from: string; to: string }>,
  conflicts: Array<{ from: string; to: string }>,
  key: string,
  value: unknown,
  from: string,
): void {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    return
  }

  if (Object.prototype.hasOwnProperty.call(normalized, key)) {
    if (!valuesMatch(normalized[key], value)) {
      conflicts.push({ from, to: key })
    }
    return
  }

  normalized[key] = value
  normalizedKeys.push({ from, to: key })
}

function collectAssetIds(refs: Record<string, unknown>[]): string[] {
  return refs
    .map((ref) => assetRefAssetId(ref))
    .filter((assetId): assetId is string => typeof assetId === 'string')
}

function collectUrls(
  refs: Record<string, unknown>[],
  options?: { skipRefsWithAssetId?: boolean },
): string[] {
  return refs
    .filter((ref) => !options?.skipRefsWithAssetId || !assetRefAssetId(ref))
    .map((ref) => assetRefUrl(ref))
    .filter((url): url is string => typeof url === 'string')
}

function deriveAssetRefFields(
  action: string,
  normalized: Record<string, unknown>,
  normalizedKeys: Array<{ from: string; to: string }>,
  conflicts: Array<{ from: string; to: string }>,
): void {
  const singleRef = normalized.asset_ref
  const refs = assetRefRecords(normalized.asset_refs)
  const singleAssetId = assetRefAssetId(singleRef)
  const singleUrl = assetRefUrl(singleRef)

  switch (action) {
    case 'read_document':
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'asset_id',
        singleAssetId,
        'asset_ref.asset_id',
      )
      return
    case 'analyze_image': {
      if (singleAssetId) {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'asset_id',
          singleAssetId,
          'asset_ref.asset_id',
        )
      } else {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'image_url',
          singleUrl,
          'asset_ref.url',
        )
      }
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'asset_ids',
        collectAssetIds(refs),
        'asset_refs[].asset_id',
      )
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'image_urls',
        collectUrls(refs, { skipRefsWithAssetId: true }),
        'asset_refs[].url',
      )
      return
    }
    case 'analyze_video':
    case 'transcribe_audio':
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'media_url',
        singleUrl,
        'asset_ref.url',
      )
      return
    case 'process_media':
      setDerivedValue(normalized, normalizedKeys, conflicts, 'url', singleUrl, 'asset_ref.url')
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'inputs',
        collectUrls(refs).map((url) => ({ url })),
        'asset_refs[].url',
      )
      return
    case 'upload_skill_asset':
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'image_url',
        singleUrl,
        'asset_ref.url',
      )
      return
    case 'attach_form_asset':
      if (singleAssetId) {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'media_asset_id',
          singleAssetId,
          'asset_ref.asset_id',
        )
      } else {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'file_url',
          singleUrl,
          'asset_ref.url',
        )
      }
      return
    case 'attach_funnel_asset':
    case 'attach_presentation_asset':
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'media_asset_id',
        singleAssetId,
        'asset_ref.asset_id',
      )
      return
    case 'generate_image':
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'input_image_url',
        singleUrl,
        'asset_ref.url',
      )
      setDerivedValue(
        normalized,
        normalizedKeys,
        conflicts,
        'input_image_urls',
        collectUrls(refs),
        'asset_refs[].url',
      )
      return
    case 'edit_image':
      if (singleAssetId) {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'parent_image_asset_id',
          singleAssetId,
          'asset_ref.asset_id',
        )
      } else {
        setDerivedValue(
          normalized,
          normalizedKeys,
          conflicts,
          'parent_image_url',
          singleUrl,
          'asset_ref.url',
        )
      }
      return
    default:
      return
  }
}

export function normalizeArtifactActionData(
  action: string,
  data: Record<string, unknown>,
): NormalizedActionData {
  const aliases = ACTION_ALIASES[action] ?? {}
  const normalized: Record<string, unknown> = {}
  const normalizedKeys: Array<{ from: string; to: string }> = []
  const conflicts: Array<{ from: string; to: string }> = []

  for (const [rawKey, value] of Object.entries(data)) {
    const snakeKey = toSnakeCaseKey(rawKey)
    const normalizedKey = aliases[snakeKey] ?? snakeKey

    if (normalizedKey !== rawKey) {
      normalizedKeys.push({ from: rawKey, to: normalizedKey })
    }

    if (
      Object.prototype.hasOwnProperty.call(normalized, normalizedKey) &&
      !valuesMatch(normalized[normalizedKey], value)
    ) {
      conflicts.push({ from: rawKey, to: normalizedKey })
      continue
    }

    normalized[normalizedKey] = value
  }

  deriveAssetRefFields(action, normalized, normalizedKeys, conflicts)

  return { data: normalized, normalizedKeys, conflicts }
}
