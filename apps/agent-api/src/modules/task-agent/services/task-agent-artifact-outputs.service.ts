import { Injectable, Logger } from '@nestjs/common'
import { TaskAgentRepository } from '../repositories/task-agent.repository'
import {
  SCOPED_ARTIFACT_SPECS,
  type ScopedArtifactSpec,
} from './task-agent-artifact-output-specs'

const TASK_DOCUMENT_LOOKBACK_MS = 5_000
const TASK_DOCUMENT_LIMIT = 10
const TASK_ARTIFACT_LIMIT = 10

const TASK_OUTPUT_BLOCK_TYPES = new Set([
  'artifact_preview',
  'document_card',
  'pdf_file',
  'docx_file',
  'project_preview',
  'widget_preview',
  'browser_screenshot',
  'media_asset',
])

function plainSnippet(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function hasText(value: unknown): boolean {
  return trimmedString(value).length > 0
}

function hasContent(value: unknown): boolean {
  if (hasText(value)) return true
  if (Array.isArray(value)) return value.length > 0
  if (isRecord(value)) return Object.keys(value).length > 0
  return false
}

function taskOutputBlockKey(block: Record<string, unknown>): string {
  const type = trimmedString(block.type)
  if (type === 'document_card') {
    const documentId = trimmedString(block.documentId)
    const spaceItemId = trimmedString(block.spaceItemId)
    return `document:${documentId || spaceItemId || trimmedString(block.id)}`
  }
  if (type === 'artifact_preview') {
    return `artifact:${trimmedString(block.artifactType)}:${trimmedString(block.artifactId)}`
  }
  if (type === 'media_asset') {
    return `media:${trimmedString(block.mediaAssetId) || trimmedString(block.url)}`
  }
  if (type === 'project_preview') return `project:${trimmedString(block.project_id)}`
  if (type === 'widget_preview') return `widget:${trimmedString(block.id)}`
  if (type === 'browser_screenshot') return `browser:${trimmedString(block.imageUrl)}`
  if (type === 'pdf_file' || type === 'docx_file') {
    return `${type}:${trimmedString(block.url) || trimmedString(block.id)}`
  }
  return `${type}:${trimmedString(block.id)}`
}

function isTaskOutputBlock(block: Record<string, unknown>): boolean {
  const type = trimmedString(block.type)
  if (!TASK_OUTPUT_BLOCK_TYPES.has(type)) return false
  const key = taskOutputBlockKey(block)
  return !key.endsWith(':') && !key.endsWith('::')
}

function firstString(row: Record<string, unknown>, fields: string[], fallback: string): string {
  for (const field of fields) {
    const value = trimmedString(row[field])
    if (value) return value.slice(0, 160)
  }
  return fallback
}

function mediaKind(row: Record<string, unknown>): 'image' | 'video' | 'audio' | 'file' {
  const assetType = trimmedString(row.asset_type).toLowerCase()
  const mimeType = trimmedString(row.mime_type).toLowerCase()
  if (assetType === 'image' || mimeType.startsWith('image/')) return 'image'
  if (assetType === 'video' || mimeType.startsWith('video/')) return 'video'
  if (assetType === 'audio' || mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

@Injectable()
export class TaskAgentArtifactOutputsService {
  private readonly logger = new Logger(TaskAgentArtifactOutputsService.name)

  constructor(private readonly repository: TaskAgentRepository) {}

  async reconcile(input: {
    blocks: Array<Record<string, unknown>>
    outputBlocks?: Array<Record<string, unknown>>
    itemId: string
    spaceId: string
    userId: string
    orgId: string | null
    campaignId?: string | null
    startedAt: number
  }): Promise<Array<Record<string, unknown>>> {
    const merged = [...input.blocks]
    const seenKeys = new Set<string>()
    for (const block of merged) {
      if (!isRecord(block) || !isTaskOutputBlock(block)) continue
      seenKeys.add(taskOutputBlockKey(block))
    }

    for (const block of input.outputBlocks ?? []) {
      if (!isRecord(block) || !isTaskOutputBlock(block)) continue
      const key = taskOutputBlockKey(block)
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      merged.push(block)
    }

    const withDocuments = await this.reconcileSpaceDocuments({
      ...input,
      blocks: merged,
      seenKeys,
    })

    return this.reconcilePersistedArtifacts({
      ...input,
      blocks: withDocuments,
      seenKeys,
    })
  }

  private async reconcileSpaceDocuments(input: {
    blocks: Array<Record<string, unknown>>
    seenKeys: Set<string>
    itemId: string
    spaceId: string
    userId: string
    orgId: string | null
    campaignId?: string | null
    startedAt: number
  }): Promise<Array<Record<string, unknown>>> {
    const createdAfter = new Date(
      Math.max(0, input.startedAt - TASK_DOCUMENT_LOOKBACK_MS),
    ).toISOString()
    const { data, error } = await this.repository.listRecentSpaceDocuments({
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      createdAfter,
      limit: TASK_DOCUMENT_LIMIT,
    })
    if (error) {
      this.logger.warn(`Task document reconciliation failed for ${input.itemId}: ${error.message}`)
      return input.blocks
    }

    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
    const additions: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const spaceItemId = trimmedString(row.id)
      if (!spaceItemId) continue
      const customData = isRecord(row.custom_data) ? row.custom_data : {}
      const documentId = trimmedString(customData._conversation_document_id)
      const key = `document:${documentId || spaceItemId}`
      if (input.seenKeys.has(key)) continue

      additions.push({
        type: 'document_card',
        id: `document-${documentId || spaceItemId}`,
        title: String(row.title ?? 'Untitled Document'),
        ...(documentId ? { documentId } : {}),
        spaceId: input.spaceId,
        spaceItemId,
        snippet: plainSnippet(row.doc_body),
      })
      input.seenKeys.add(key)
    }

    return additions.length > 0 ? [...input.blocks, ...additions] : input.blocks
  }

  private async reconcilePersistedArtifacts(input: {
    blocks: Array<Record<string, unknown>>
    seenKeys: Set<string>
    itemId: string
    spaceId: string
    userId: string
    orgId: string | null
    campaignId?: string | null
    startedAt: number
  }): Promise<Array<Record<string, unknown>>> {
    const additions: Array<Record<string, unknown>> = []
    const createdAfter = new Date(
      Math.max(0, input.startedAt - TASK_DOCUMENT_LOOKBACK_MS),
    ).toISOString()

    for (const spec of SCOPED_ARTIFACT_SPECS) {
      const rows = await this.listScopedArtifactRows(spec, input, createdAfter)
      if (rows.length === 0) continue
      const renderableIds = await this.renderableArtifactIds(spec, rows, input)
      for (const row of rows) {
        const artifactId = trimmedString(row.id)
        if (!artifactId) continue
        if (renderableIds && !renderableIds.has(artifactId)) continue
        const block = this.buildArtifactBlock(spec, row, input.spaceId)
        const key = taskOutputBlockKey(block)
        if (input.seenKeys.has(key)) continue
        input.seenKeys.add(key)
        additions.push(block)
      }
    }

    additions.push(...(await this.reconcileSpaceItems(input, createdAfter)))
    additions.push(...(await this.reconcileTaskEmails(input, createdAfter)))
    additions.push(...(await this.reconcileMediaAssets(input, createdAfter)))
    return additions.length > 0 ? [...input.blocks, ...additions] : input.blocks
  }

  private async listScopedArtifactRows(
    spec: ScopedArtifactSpec,
    input: {
      itemId: string
      spaceId: string
      userId: string
      orgId: string | null
      campaignId?: string | null
    },
    createdAfter: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.repository.listRecentScopedRows({
      table: spec.table,
      select: spec.select,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      campaignId: input.campaignId,
      createdAfter,
      limit: TASK_ARTIFACT_LIMIT,
      userColumn: spec.userColumn,
      campaignColumn: spec.campaignColumn,
    })
    if (error) {
      this.logger.warn(
        `Task ${spec.table} reconciliation failed for ${input.itemId}: ${error.message}`,
      )
      return []
    }
    return Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []
  }

  private async renderableArtifactIds(
    spec: ScopedArtifactSpec,
    rows: Array<Record<string, unknown>>,
    input: { itemId: string; orgId: string | null },
  ): Promise<Set<string> | null> {
    if (spec.renderable === 'presentation') return this.renderablePresentationIds(rows, input)
    if (spec.renderable === 'funnel') return this.renderableFunnelIds(rows, input)
    return null
  }

  private async renderablePresentationIds(
    rows: Array<Record<string, unknown>>,
    input: { itemId: string; orgId: string | null },
  ): Promise<Set<string>> {
    const renderableIds = new Set(
      rows.filter((row) => hasText(row.generated_html)).map((row) => trimmedString(row.id)),
    )
    const ids = rows.map((row) => trimmedString(row.id)).filter(Boolean)
    if (ids.length === 0) return renderableIds
    const { data, error } = await this.repository.listPresentationFiles(ids, input.orgId)
    if (error) {
      this.logger.warn(`Task presentation file reconciliation failed for ${input.itemId}: ${error.message}`)
      return renderableIds
    }
    for (const file of Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []) {
      if (hasContent(file.content)) renderableIds.add(trimmedString(file.presentation_id))
    }
    return renderableIds
  }

  private async renderableFunnelIds(
    rows: Array<Record<string, unknown>>,
    input: { itemId: string; orgId: string | null },
  ): Promise<Set<string>> {
    const renderableIds = new Set(
      rows.filter((row) => hasText(row.home_page_id)).map((row) => trimmedString(row.id)),
    )
    const ids = rows.map((row) => trimmedString(row.id)).filter(Boolean)
    if (ids.length === 0) return renderableIds
    const [{ data: pages, error: pagesError }, { data: files, error: filesError }] =
      await Promise.all([
        this.repository.listFunnelPages(ids, input.orgId),
        this.repository.listFunnelFiles(ids, input.orgId),
      ])
    if (pagesError) {
      this.logger.warn(`Task funnel page reconciliation failed for ${input.itemId}: ${pagesError.message}`)
    }
    if (filesError) {
      this.logger.warn(`Task funnel file reconciliation failed for ${input.itemId}: ${filesError.message}`)
    }
    for (const page of Array.isArray(pages) ? (pages as Array<Record<string, unknown>>) : []) {
      if (hasContent(page.generated_html) || hasContent(page.content) || hasContent(page.sections)) {
        renderableIds.add(trimmedString(page.funnel_id))
      }
    }
    for (const file of Array.isArray(files) ? (files as Array<Record<string, unknown>>) : []) {
      if (hasContent(file.content)) renderableIds.add(trimmedString(file.funnel_id))
    }
    return renderableIds
  }

  private buildArtifactBlock(
    spec: ScopedArtifactSpec,
    row: Record<string, unknown>,
    spaceId: string,
  ): Record<string, unknown> {
    const artifactId = trimmedString(row.id)
    const status = spec.statusField ? trimmedString(row[spec.statusField]) : ''
    const imageUrl = spec.imageField ? trimmedString(row[spec.imageField]) : ''
    const videoUrl = spec.videoField ? trimmedString(row[spec.videoField]) : ''
    return {
      type: 'artifact_preview',
      id: `artifact-${spec.idPrefix}-${artifactId}`,
      artifactType: spec.artifactType,
      artifactId,
      name: firstString(row, spec.titleFields, spec.fallbackName),
      spaceId,
      ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
      ...(status ? { status } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(videoUrl ? { videoUrl } : {}),
    }
  }

  private async reconcileTaskEmails(
    input: {
      blocks: Array<Record<string, unknown>>
      seenKeys: Set<string>
      itemId: string
      spaceId: string
      userId: string
      orgId: string | null
      campaignId?: string | null
    },
    createdAfter: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.repository.listRecentTaskEmails({
      itemId: input.itemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      campaignId: input.campaignId,
      createdAfter,
      limit: TASK_ARTIFACT_LIMIT,
    })
    if (error) {
      this.logger.warn(`Task email reconciliation failed for ${input.itemId}: ${error.message}`)
      return []
    }
    const additions: Array<Record<string, unknown>> = []
    for (const row of Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []) {
      const artifactId = trimmedString(row.id)
      if (!artifactId) continue
      const block: Record<string, unknown> = {
        type: 'artifact_preview',
        id: `email-${artifactId}`,
        artifactType: 'email',
        artifactId,
        name: firstString(row, ['subject'], 'Untitled Email'),
        subtitle: 'Email draft',
        bodyPreview: plainSnippet(row.body),
        spaceId: input.spaceId,
        ...(hasText(row.status) ? { status: trimmedString(row.status) } : {}),
      }
      const key = taskOutputBlockKey(block)
      if (input.seenKeys.has(key)) continue
      input.seenKeys.add(key)
      additions.push(block)
    }
    return additions
  }

  private async reconcileSpaceItems(
    input: {
      seenKeys: Set<string>
      itemId: string
      spaceId: string
      userId: string
      orgId: string | null
    },
    createdAfter: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.repository.listRecentSpaceItems({
      itemId: input.itemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      createdAfter,
      limit: TASK_ARTIFACT_LIMIT,
    })
    if (error) {
      this.logger.warn(`Task Space item reconciliation failed for ${input.itemId}: ${error.message}`)
      return []
    }
    const additions: Array<Record<string, unknown>> = []
    const rows = Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []
    for (const row of rows) {
      const artifactId = trimmedString(row.id)
      if (!artifactId || artifactId === input.itemId) continue
      const customData = isRecord(row.custom_data) ? row.custom_data : {}
      const viewType = trimmedString(customData._view_type).replace(/_/g, '-')
      if (viewType === 'doc' && !hasText(customData._doc_visual_html)) continue
      const artifactType =
        viewType === 'doc' ? 'visual-doc' : !viewType || viewType === 'task' ? 'task' : 'custom-object'
      const block: Record<string, unknown> = {
        type: 'artifact_preview',
        id: `artifact-${artifactType}-${artifactId}`,
        artifactType,
        artifactId,
        name: firstString(row, ['title'], 'Untitled Item'),
        spaceId: input.spaceId,
        ...(hasText(row.status) ? { status: trimmedString(row.status) } : {}),
      }
      const key = taskOutputBlockKey(block)
      if (input.seenKeys.has(key)) continue
      input.seenKeys.add(key)
      additions.push(block)
    }
    return additions
  }

  private async reconcileMediaAssets(
    input: {
      blocks: Array<Record<string, unknown>>
      seenKeys: Set<string>
      itemId: string
      spaceId: string
      userId: string
      orgId: string | null
      campaignId?: string | null
    },
    createdAfter: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.repository.listRecentScopedRows({
      table: 'media_assets',
      select:
        'id, name, original_filename, public_url, mime_type, asset_type, source_prompt, campaign_id, space_id, created_at',
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      campaignId: input.campaignId,
      createdAfter,
      limit: TASK_ARTIFACT_LIMIT,
    })
    if (error) {
      this.logger.warn(`Task media reconciliation failed for ${input.itemId}: ${error.message}`)
      return []
    }
    const additions: Array<Record<string, unknown>> = []
    const rows = Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []
    for (const row of rows) {
      const mediaAssetId = trimmedString(row.id)
      const url = trimmedString(row.public_url)
      if (!mediaAssetId || !url) continue
      const title = firstString(row, ['name', 'original_filename'], 'Generated media')
      const block: Record<string, unknown> = {
        type: 'media_asset',
        id: `media-${mediaAssetId}`,
        mediaAssetId,
        url,
        title,
        kind: mediaKind(row),
        fileName: firstString(row, ['original_filename', 'name'], title),
        ...(hasText(row.mime_type) ? { mimeType: trimmedString(row.mime_type) } : {}),
        ...(hasText(row.source_prompt) ? { prompt: trimmedString(row.source_prompt) } : {}),
      }
      const key = taskOutputBlockKey(block)
      if (input.seenKeys.has(key)) continue
      input.seenKeys.add(key)
      additions.push(block)
    }
    return additions
  }
}
