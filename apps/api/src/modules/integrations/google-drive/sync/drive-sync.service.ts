import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorReporter, reportAppError, resolveScopedOrgId } from '@vibey/api-shared'
import type {
  CreateDriveFolderMappingDto,
  UpdateDriveFolderMappingDto,
} from '../dto/drive-mapping.dto'
import { DriveFolderMappingsRepository } from '../repositories/drive-folder-mappings.repository'
import { GoogleDriveAdminClientRepository } from '../repositories/google-drive-admin-client.repository'
import {
  DriveSyncDiffService,
  type DriveNode,
  type DriveSource,
  type MappingRecord,
} from './drive-sync-diff.service'

type SyncReason = 'manual' | 'cron' | 'initial' | 'push'

const MAX_MAPPINGS_PER_SPACE = 20
const PUSH_CHANNEL_TTL_MS = 24 * 60 * 60 * 1000

@Injectable()
export class DriveSyncService {
  private readonly logger = new Logger(DriveSyncService.name)

  constructor(
    private readonly repo: DriveFolderMappingsRepository,
    private readonly errorReporter: ErrorReporter,
    private readonly diffService: DriveSyncDiffService,
    private readonly adminClientRepository: GoogleDriveAdminClientRepository,
  ) {}

  async listMappings(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
  ) {
    await this.assertSpaceAccess(supabase, userId, spaceId, orgId)
    return this.repo.listMappings(supabase, spaceId, { userId, orgId })
  }

  async createMapping(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: CreateDriveFolderMappingDto,
    orgId?: string | null,
  ) {
    const space = await this.assertSpaceAccess(supabase, userId, spaceId, orgId)
    const existingMappings = await this.repo.listMappings(supabase, spaceId, { userId, orgId })
    if (
      existingMappings.some(
        (mapping) => String(mapping.drive_folder_id ?? '') === String(dto.drive_folder_id),
      )
    ) {
      throw new ConflictException('mapping_exists')
    }
    if (existingMappings.length >= MAX_MAPPINGS_PER_SPACE) {
      throw new BadRequestException('too_many_mappings')
    }
    const nowIso = new Date().toISOString()
    const mappingId = randomUUID()
    const effectiveOrgId = resolveScopedOrgId({ orgId: orgId ?? null })

    const resolvedSource: DriveSource = dto.source
      ? dto.source
      : dto.drive_id
        ? 'shared_drives'
        : 'my_drive'

    const createdMapping = await this.repo.insertMapping(supabase, {
      id: mappingId,
      space_id: spaceId,
      org_id: effectiveOrgId,
      user_id: userId,
      provider: 'google_drive',
      drive_folder_id: dto.drive_folder_id,
      drive_id: dto.drive_id ?? null,
      drive_folder_name: dto.drive_folder_name,
      root_space_item_id: null,
      enabled: true,
      sync_status: 'idle',
      last_synced_at: null,
      last_sync_error: null,
      next_sync_at: nowIso,
      sync_interval_seconds: 600,
      source: resolvedSource,
      created_at: nowIso,
      updated_at: nowIso,
    })

    const rootItem = await this.repo.createRootSpaceItem(supabase, {
      id: randomUUID(),
      space_id: spaceId,
      org_id: effectiveOrgId,
      user_id: userId,
      title: dto.drive_folder_name,
      parent_item_id: null,
      custom_data: {
        _view_type: 'doc',
        _doc_kind: 'folder',
        _doc_source: 'drive',
        _drive_folder_mapping_id: mappingId,
        _drive_file_id: dto.drive_folder_id,
        _drive_modified_time: nowIso,
        _drive_mime_type: 'application/vnd.google-apps.folder',
        _drive_list_source: resolvedSource,
        _drive_workspace_id: dto.drive_id ?? null,
      },
    })

    const mapping = await this.repo.updateMapping(supabase, mappingId, {
      root_space_item_id: rootItem.id,
      updated_at: new Date().toISOString(),
    })

    await this.enqueueSync(mappingId, 'initial', userId)
    await this.ensurePushChannelForMapping(this.toMappingRecord(mapping))

    return { mapping, root_item: rootItem, space }
  }

  async updateMapping(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    mappingId: string,
    dto: UpdateDriveFolderMappingDto,
    orgId?: string | null,
  ) {
    const mapping = await this.repo.getMapping(supabase, spaceId, mappingId, { userId, orgId })
    if (!mapping) throw new NotFoundException('Drive mapping not found')

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (dto.enabled !== undefined) payload.enabled = dto.enabled
    if (dto.sync_interval_seconds !== undefined) {
      payload.sync_interval_seconds = dto.sync_interval_seconds
      payload.next_sync_at = new Date(Date.now() + dto.sync_interval_seconds * 1000).toISOString()
    }

    if (dto.enabled === true) {
      payload.next_sync_at = new Date().toISOString()
    }

    return this.repo.updateMapping(supabase, mappingId, payload)
  }

  async deleteMapping(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    mappingId: string,
    orgId?: string | null,
    deleteSyncedItems = true,
  ) {
    const mapping = await this.repo.getMapping(supabase, spaceId, mappingId, { userId, orgId })
    if (!mapping) throw new NotFoundException('Drive mapping not found')

    if (deleteSyncedItems && typeof mapping.root_space_item_id === 'string') {
      await this.repo.deleteSpaceItem(supabase, mapping.root_space_item_id, spaceId)
    }

    await this.repo.deleteMapping(supabase, mappingId)
    return { deleted: true }
  }

  async syncNow(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    mappingId: string,
    orgId?: string | null,
  ) {
    const mapping = await this.repo.getMapping(supabase, spaceId, mappingId, { userId, orgId })
    if (!mapping) throw new NotFoundException('Drive mapping not found')
    if ((mapping.sync_status as string) === 'syncing') {
      throw new ConflictException('already_syncing')
    }

    await this.enqueueSync(mappingId, 'manual', userId)
    return { accepted: true }
  }

  async enqueueSync(mappingId: string, reason: SyncReason, userId: string): Promise<void> {
    const admin = this.getAdminClient()
    await this.repo.setNextSyncAtNow(admin, mappingId)

    const queueWorkerUrl = (process.env.QUEUE_WORKER_URL ?? '').replace(/\/+$/, '')
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''

    if (!queueWorkerUrl || !internalToken) {
      this.logger.warn(
        `Drive sync enqueue fallback for mapping=${mappingId} reason=${reason}: queue worker env missing – running sync inline`,
      )
      void this.runSyncForMapping(mappingId).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.error(`Drive sync inline fallback failed for mapping=${mappingId}: ${msg}`)
      })
      return
    }

    const res = await fetch(`${queueWorkerUrl}/internal/drive-sync/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify({ mappingId, reason, userId }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.warn(
        `Drive sync enqueue failed for mapping=${mappingId} reason=${reason}: ${res.status} ${body}`,
      )
    }
  }

  async runSyncForMapping(mappingId: string): Promise<{
    success: boolean
    mappingId: string
    skipped?: boolean
    reason?: string
    inserted?: number
    updated?: number
    deleted?: number
    total?: number
  }> {
    if (!mappingId) {
      throw new BadRequestException('mappingId is required')
    }

    const admin = this.getAdminClient()
    const claimedRaw = await this.repo.claimMappingForSync(admin, mappingId)
    if (!claimedRaw) {
      const current = await this.repo.getMappingByIdForSync(admin, mappingId)
      if (!current) return { success: true, mappingId, skipped: true, reason: 'not_found' }
      if ((current.sync_status as string) === 'syncing') {
        return { success: true, mappingId, skipped: true, reason: 'already_syncing' }
      }
      if (current.enabled === false) {
        return { success: true, mappingId, skipped: true, reason: 'disabled' }
      }
      return { success: true, mappingId, skipped: true, reason: 'not_claimed' }
    }

    const mapping = this.toMappingRecord(claimedRaw)
    const startedAt = Date.now()

    try {
      const expected = await this.walkDriveTree(admin, mapping)
      const existing = await this.repo.listSpaceItemsForMapping(admin, mapping.space_id, mapping.id)
      const diff = await this.applyDiff(admin, mapping, expected, existing)
      await this.repo.markMappingSynced(admin, mapping.id, mapping.sync_interval_seconds || 600)

      this.logger.log(
        JSON.stringify({
          mappingId: mapping.id,
          files_changed: diff.inserted + diff.updated + diff.deleted,
          inserted: diff.inserted,
          updated: diff.updated,
          deleted: diff.deleted,
          total: expected.size,
          ms: Date.now() - startedAt,
        }),
      )

      return {
        success: true,
        mappingId,
        inserted: diff.inserted,
        updated: diff.updated,
        deleted: diff.deleted,
        total: expected.size,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.repo.markMappingError(admin, mapping.id, message, 60)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/google_drive/sync',
          error_code: 'sync_mapping_failed',
          message,
          stack: error instanceof Error ? error.stack : undefined,
          user_id: mapping.user_id,
          context: { mappingId: mapping.id, spaceId: mapping.space_id },
        },
        error,
      )
      this.logger.error(
        JSON.stringify({
          mappingId: mapping.id,
          error: message,
          ms: Date.now() - startedAt,
        }),
      )
      throw error
    }
  }

  async handleDrivePushNotification(input: {
    channelId: string
    channelToken?: string | null
    resourceState?: string | null
  }): Promise<{ accepted: boolean; enqueued: boolean; mappingId?: string }> {
    try {
      const admin = this.getAdminClient()
      const channel = await this.repo.getPushChannelByChannelId(admin, input.channelId)
      if (!channel) {
        return { accepted: false, enqueued: false }
      }

      const expectedToken = this.asString(channel.channel_token)
      if (expectedToken && input.channelToken && input.channelToken !== expectedToken) {
        return { accepted: false, enqueued: false }
      }

      await this.repo.markPushChannelNotified(admin, input.channelId, new Date().toISOString())
      const mappingId = this.asString(channel.mapping_id)
      const userId = this.asString(channel.user_id)
      if (!mappingId || !userId) {
        return { accepted: true, enqueued: false }
      }

      const state = (input.resourceState ?? '').toLowerCase()
      const shouldEnqueue =
        state === '' || state === 'sync' || state === 'change' || state === 'update'
      if (!shouldEnqueue) {
        return { accepted: true, enqueued: false, mappingId }
      }

      await this.enqueueSync(mappingId, 'push', userId)
      return { accepted: true, enqueued: true, mappingId }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      reportAppError(
        this.errorReporter,
        {
          app: 'api',
          feature: 'integrations/google_drive_push_webhook',
          error_code: 'drive_push_handler_failed',
          message,
          stack,
          category: 'webhook',
          context: { channel_id: input.channelId, resource_state: input.resourceState ?? null },
        },
        err,
      )
      throw err
    }
  }

  async renewDuePushChannels(): Promise<{ renewed: number }> {
    const admin = this.getAdminClient()
    const renewBeforeIso = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const expiring = await this.repo.listExpiringPushChannels(admin, renewBeforeIso, 200)
    let renewed = 0
    for (const row of expiring) {
      const mappingId = this.asString(row.mapping_id)
      const spaceId = this.asString(row.space_id)
      const orgId = this.asString(row.org_id)
      const userId = this.asString(row.user_id)
      const channelId = this.asString(row.channel_id)
      const channelToken = this.asString(row.channel_token)
      if (!mappingId || !spaceId || !userId || !channelId || !channelToken) continue
      const expirationAt = new Date(Date.now() + PUSH_CHANNEL_TTL_MS).toISOString()
      await this.repo.upsertPushChannel(admin, {
        mapping_id: mappingId,
        space_id: spaceId,
        org_id: orgId,
        user_id: userId,
        provider: 'google_drive',
        channel_id: channelId,
        channel_token: channelToken,
        resource_id: this.asString(row.resource_id),
        resource_uri: this.asString(row.resource_uri),
        expiration_at: expirationAt,
        active: true,
        updated_at: new Date().toISOString(),
      })
      renewed += 1
    }
    return { renewed }
  }

  private async assertSpaceAccess(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
  ): Promise<Record<string, unknown>> {
    const space = await this.repo.findSpaceById(supabase, spaceId, { userId, orgId })
    if (!space) throw new NotFoundException('Space not found')
    if (space.id !== spaceId) {
      throw new BadRequestException('Invalid space')
    }
    return space
  }

  private getAdminClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !serviceRoleKey) {
      throw new BadRequestException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return this.adminClientRepository.getClient()
  }

  private async ensurePushChannelForMapping(mapping: MappingRecord): Promise<void> {
    const admin = this.getAdminClient()
    const nowIso = new Date().toISOString()
    const expirationAt = new Date(Date.now() + PUSH_CHANNEL_TTL_MS).toISOString()
    await this.repo.upsertPushChannel(admin, {
      mapping_id: mapping.id,
      space_id: mapping.space_id,
      org_id: mapping.org_id,
      user_id: mapping.user_id,
      provider: 'google_drive',
      channel_id: `drive-map-${mapping.id}`,
      channel_token: randomUUID(),
      resource_id: null,
      resource_uri: null,
      expiration_at: expirationAt,
      active: true,
      updated_at: nowIso,
    })
  }

  private toMappingRecord(input: Record<string, unknown>): MappingRecord {
    const rawSource = String(input.source ?? '')
    const source: DriveSource =
      rawSource === 'shared_with_me' || rawSource === 'shared_drives' || rawSource === 'my_drive'
        ? rawSource
        : input.drive_id
          ? 'shared_drives'
          : 'my_drive'
    return {
      id: String(input.id),
      space_id: String(input.space_id),
      org_id: this.asString(input.org_id),
      user_id: String(input.user_id),
      drive_folder_id: String(input.drive_folder_id),
      drive_id: input.drive_id ? String(input.drive_id) : null,
      drive_folder_name: String(input.drive_folder_name ?? ''),
      root_space_item_id: input.root_space_item_id ? String(input.root_space_item_id) : null,
      sync_status: (input.sync_status as MappingRecord['sync_status']) ?? 'idle',
      sync_interval_seconds: Number(input.sync_interval_seconds ?? 600),
      source,
    }
  }

  private async walkDriveTree(
    admin: SupabaseClient,
    mapping: MappingRecord,
  ): Promise<Map<string, DriveNode>> {
    return this.diffService.walkDriveTree(admin, mapping)
  }

  private async applyDiff(
    admin: SupabaseClient,
    mapping: MappingRecord,
    expected: Map<string, DriveNode>,
    existingRows: Record<string, unknown>[],
  ): Promise<{ inserted: number; updated: number; deleted: number }> {
    return this.diffService.applyDiff(admin, mapping, expected, existingRows)
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null
  }
}
