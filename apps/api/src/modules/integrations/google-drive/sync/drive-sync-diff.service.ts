import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorReporter } from '@vibey/api-shared'
import { DriveFolderMappingsRepository } from '../repositories/drive-folder-mappings.repository'
import { GoogleDriveApiService } from '../services/google-drive-api.service'

type DriveNodeKind = 'folder' | 'file'

export type DriveSource = 'my_drive' | 'shared_with_me' | 'shared_drives'

export type DriveNode = {
  driveId: string
  parentDriveId: string | null
  name: string
  mimeType: string
  modifiedTime: string | null
  webViewLink: string | null
  iconLink: string | null
  thumbnailLink: string | null
  kind: DriveNodeKind
  depth: number
}

export type MappingRecord = {
  id: string
  space_id: string
  org_id: string | null
  user_id: string
  drive_folder_id: string
  drive_id: string | null
  drive_folder_name: string
  root_space_item_id: string | null
  sync_status: 'idle' | 'syncing' | 'error'
  sync_interval_seconds: number
  source: DriveSource
}

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const MAX_RECURSION_DEPTH = 10
const MAX_NODES_PER_MAPPING = 5_000
const MAX_LIST_CALLS_PER_SYNC = 200

@Injectable()
export class DriveSyncDiffService {
  constructor(
    private readonly repo: DriveFolderMappingsRepository,
    private readonly googleDriveApi: GoogleDriveApiService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async walkDriveTree(
    admin: SupabaseClient,
    mapping: MappingRecord,
  ): Promise<Map<string, DriveNode>> {
    let rootMeta: {
      id: string
      name: string
      mimeType: string
      modifiedTime?: string
      webViewLink?: string
      iconLink?: string
      thumbnailLink?: string
    } | null = null
    try {
      rootMeta = (await this.googleDriveApi.getFile(
        admin,
        mapping.user_id,
        mapping.drive_folder_id,
        mapping.org_id,
      )) as {
        id: string
        name: string
        mimeType: string
        modifiedTime?: string
        webViewLink?: string
        iconLink?: string
        thumbnailLink?: string
      }
    } catch {
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'integrations/google_drive/sync',
        error_code: 'drive_root_metadata_failed',
        message: 'getFile failed for mapped drive folder',
        user_id: mapping.user_id,
        context: { drive_folder_id: mapping.drive_folder_id, mappingId: mapping.id },
      })
      rootMeta = null
    }

    const rootNode: DriveNode = {
      driveId: mapping.drive_folder_id,
      parentDriveId: null,
      name: rootMeta?.name || mapping.drive_folder_name || 'Drive Folder',
      mimeType: rootMeta?.mimeType || DRIVE_FOLDER_MIME_TYPE,
      modifiedTime: rootMeta?.modifiedTime ?? null,
      webViewLink: rootMeta?.webViewLink ?? null,
      iconLink: rootMeta?.iconLink ?? null,
      thumbnailLink: rootMeta?.thumbnailLink ?? null,
      kind: 'folder',
      depth: 0,
    }

    const nodes = new Map<string, DriveNode>()
    nodes.set(rootNode.driveId, rootNode)

    const queue: DriveNode[] = [rootNode]
    let listCalls = 0

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.depth >= MAX_RECURSION_DEPTH) continue

      let pageToken: string | undefined
      do {
        listCalls += 1
        if (listCalls > MAX_LIST_CALLS_PER_SYNC) {
          throw new BadRequestException('too_many_drive_list_calls')
        }

        const page = await this.googleDriveApi.listFiles(
          admin,
          mapping.user_id,
          {
            folderId: current.driveId,
            pageToken,
            pageSize: 100,
            source: mapping.source,
            driveId: mapping.drive_id ?? undefined,
          },
          mapping.org_id,
        )

        for (const file of page.files ?? []) {
          const driveId = String(file.id ?? '')
          if (!driveId || nodes.has(driveId)) continue

          const mimeType = String(file.mimeType ?? 'application/octet-stream')
          const kind: DriveNodeKind = mimeType === DRIVE_FOLDER_MIME_TYPE ? 'folder' : 'file'
          const node: DriveNode = {
            driveId,
            parentDriveId: current.driveId,
            name: String(file.name ?? 'Untitled'),
            mimeType,
            modifiedTime: file.modifiedTime ?? null,
            webViewLink: file.webViewLink ?? null,
            iconLink: file.iconLink ?? null,
            thumbnailLink: file.thumbnailLink ?? null,
            kind,
            depth: current.depth + 1,
          }
          nodes.set(driveId, node)

          if (nodes.size > MAX_NODES_PER_MAPPING) {
            throw new BadRequestException('too_large')
          }

          if (kind === 'folder' && node.depth < MAX_RECURSION_DEPTH) {
            queue.push(node)
          }
        }

        pageToken = page.nextPageToken
      } while (pageToken)
    }

    return nodes
  }

  async applyDiff(
    admin: SupabaseClient,
    mapping: MappingRecord,
    expected: Map<string, DriveNode>,
    existingRows: Record<string, unknown>[],
  ): Promise<{ inserted: number; updated: number; deleted: number }> {
    const existingByDriveId = new Map<
      string,
      { row: Record<string, unknown>; customData: Record<string, unknown> }
    >()
    const driveToItemId = new Map<string, string>()

    for (const row of existingRows) {
      const customData = this.asRecord(row.custom_data)
      if (!customData) continue
      const driveId = this.asString(customData._drive_file_id)
      const itemId = this.asString(row.id)
      if (!driveId || !itemId) continue
      existingByDriveId.set(driveId, { row, customData })
      driveToItemId.set(driveId, itemId)
    }

    const orderedNodes = [...expected.values()].sort((a, b) => a.depth - b.depth)
    let inserted = 0
    let updated = 0

    for (const node of orderedNodes) {
      const existing = existingByDriveId.get(node.driveId)
      const parentItemId = node.parentDriveId
        ? (driveToItemId.get(node.parentDriveId) ?? null)
        : null
      const mergedCustomData = this.buildCustomData(mapping, node, existing?.customData)

      if (!existing) {
        const created = await this.repo.insertSpaceItem(admin, {
          space_id: mapping.space_id,
          org_id: mapping.org_id,
          user_id: mapping.user_id,
          title: node.name,
          parent_item_id: parentItemId,
          custom_data: mergedCustomData,
        })
        const createdId = String(created.id)
        driveToItemId.set(node.driveId, createdId)
        if (node.driveId === mapping.drive_folder_id && mapping.root_space_item_id !== createdId) {
          await this.repo.updateMapping(admin, mapping.id, { root_space_item_id: createdId })
        }
        inserted += 1
        continue
      }

      const existingId = this.asString(existing.row.id)
      if (!existingId) continue
      driveToItemId.set(node.driveId, existingId)

      const titleChanged = String(existing.row.title ?? '') !== node.name
      const parentChanged = this.asString(existing.row.parent_item_id) !== parentItemId
      const modifiedChanged =
        this.asString(existing.customData._drive_modified_time) !== (node.modifiedTime ?? null)
      const mimeChanged = this.asString(existing.customData._drive_mime_type) !== node.mimeType
      const linkChanged =
        this.asString(existing.customData._drive_web_view_link) !== (node.webViewLink ?? null)
      const iconChanged =
        this.asString(existing.customData._drive_icon_link) !== (node.iconLink ?? null)
      const thumbChanged =
        this.asString(existing.customData._drive_thumbnail_link) !== (node.thumbnailLink ?? null)
      const sourceChanged = this.asString(existing.customData._drive_list_source) !== mapping.source
      const workspaceNormalized = (existing.customData._drive_workspace_id ?? null) as string | null
      const mappedWorkspaceNormalized = mapping.drive_id ?? null
      const workspaceChanged = workspaceNormalized !== mappedWorkspaceNormalized

      if (
        titleChanged ||
        parentChanged ||
        modifiedChanged ||
        mimeChanged ||
        linkChanged ||
        iconChanged ||
        thumbChanged ||
        sourceChanged ||
        workspaceChanged
      ) {
        await this.repo.updateSpaceItem(admin, existingId, {
          title: node.name,
          parent_item_id: parentItemId,
          custom_data: mergedCustomData,
          updated_at: new Date().toISOString(),
        })
        updated += 1
      }
    }

    const staleIds = [...existingByDriveId.entries()]
      .filter(([driveId]) => !expected.has(driveId))
      .map(([, value]) => this.asString(value.row.id))
      .filter((id): id is string => Boolean(id))

    await this.repo.deleteSpaceItemsByIds(admin, staleIds)

    return { inserted, updated, deleted: staleIds.length }
  }

  private buildCustomData(
    mapping: MappingRecord,
    node: DriveNode,
    existing: Record<string, unknown> | null = null,
  ): Record<string, unknown> {
    const result = { ...(existing ?? {}) }
    result._view_type = 'doc'
    result._doc_source = 'drive'
    result._doc_kind = node.kind
    result._drive_folder_mapping_id = mapping.id
    result._drive_file_id = node.driveId
    result._drive_list_source = mapping.source
    result._drive_workspace_id = mapping.drive_id ?? null
    result._drive_modified_time = node.modifiedTime
    result._drive_mime_type = node.mimeType
    result._drive_web_view_link = node.webViewLink
    result._drive_icon_link = node.iconLink
    result._drive_thumbnail_link = node.thumbnailLink
    if (node.kind === 'file') {
      result._drive_export_mime = this.resolveExportMime(node.mimeType)
    }
    return result
  }

  private resolveExportMime(mimeType: string): string | null {
    if (mimeType === 'application/vnd.google-apps.document') return 'text/html'
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'text/csv'
    if (mimeType === 'application/vnd.google-apps.presentation') return 'application/pdf'
    return null
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null
  }
}
