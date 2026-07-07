export function memoryToCampaignNode(
  memory: Record<string, unknown>,
  campaignId: string,
  userId: string,
): Record<string, unknown> {
  return {
    campaign_id: campaignId,
    user_id: userId,
    node_type: 'document',
    title: String(memory.source_title ?? memory.memory_type ?? 'Memory'),
    content: String(memory.content ?? ''),
    source_type: 'upload',
    source_id: String(memory.id ?? ''),
    metadata: { imported_from: 'brain_memory', source_memory_id: memory.id },
    domain: 'general',
    media_type: memory.media_type ?? 'text',
    media_url: memory.media_url ?? null,
    media_mime_type: memory.media_mime_type ?? null,
  }
}

export function snapshotToCampaignNode(
  snapshot: Record<string, unknown>,
  campaignId: string,
  userId: string,
): Record<string, unknown> {
  const content = [
    `Core: ${String(snapshot.core ?? '')}`,
    snapshot.one_liner ? `One-liner: ${String(snapshot.one_liner)}` : '',
    snapshot.story ? `Story: ${String(snapshot.story)}` : '',
    snapshot.method ? `Method: ${String(snapshot.method)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
  return {
    campaign_id: campaignId,
    user_id: userId,
    node_type: 'document',
    title: String(snapshot.name ?? snapshot.type ?? 'Snapshot'),
    content: content || String(snapshot.core ?? ''),
    source_type: 'upload',
    source_id: String(snapshot.id ?? ''),
    metadata: { imported_from: 'brain_snapshot', source_snapshot_id: snapshot.id },
    domain: 'general',
    media_type: 'text',
    media_url: null,
    media_mime_type: null,
  }
}

export function skEntryToCampaignNode(
  entry: Record<string, unknown>,
  campaignId: string,
  userId: string,
): Record<string, unknown> {
  return {
    campaign_id: campaignId,
    user_id: userId,
    node_type: String(entry.entry_type ?? 'concept'),
    title: String(entry.title ?? entry.name ?? 'Knowledge Entry'),
    content: String(entry.content ?? entry.title ?? ''),
    source_type: 'upload',
    source_id: String(entry.id ?? ''),
    metadata: { imported_from: 'brain_sk_entry', source_entry_id: entry.id },
    domain: String(entry.domain ?? 'general'),
    media_type: 'text',
    media_url: null,
    media_mime_type: null,
  }
}

export function memoriesGroupKey(memories: Array<Record<string, unknown>>): string {
  const sample = memories[0]
  return `${String(sample?.source_type ?? 'unknown')}::${String(
    sample?.source_id ?? sample?.source_title ?? 'ungrouped',
  )}`
}

export function cloneCampaignNode(
  node: Record<string, unknown>,
  campaignId: string,
  userId: string,
): Record<string, unknown> {
  return {
    campaign_id: campaignId,
    user_id: userId,
    node_type: node.node_type ?? 'document',
    title: node.title ?? 'Campaign Node',
    content: node.content ?? '',
    source_type: node.source_type ?? 'upload',
    source_id: node.source_id ?? null,
    metadata: node.metadata ?? {},
    domain: node.domain ?? 'general',
    media_type: node.media_type ?? 'text',
    media_url: node.media_url ?? null,
    media_mime_type: node.media_mime_type ?? null,
  }
}
