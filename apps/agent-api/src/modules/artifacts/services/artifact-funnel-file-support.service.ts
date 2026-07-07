import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactFunnelFilesRepository } from '../repositories/artifact-funnel-files.repository'
import { ArtifactFunnelsRepository } from '../repositories/artifact-funnels.repository'
import {
  bundleFileSizeBytes,
  getBundleMimeType,
  normalizeBundleFiles,
} from '../utils/html-bundle.util'
import { ArtifactFunnelHistoryService } from './artifact-funnel-history.service'

@Injectable()
export class ArtifactFunnelFileSupportService {
  constructor(
    private readonly funnelHistoryService: ArtifactFunnelHistoryService = new ArtifactFunnelHistoryService(),
    private readonly funnelsRepository: ArtifactFunnelsRepository = new ArtifactFunnelsRepository(),
    private readonly funnelFilesRepository: ArtifactFunnelFilesRepository = new ArtifactFunnelFilesRepository(),
  ) {}

  buildTrace(
    target: Record<string, any>,
    sessionKey: string | undefined,
    input: Record<string, unknown>,
    action: string,
  ): string {
    const conversationId =
      sessionKey && typeof target.parseConversationId === 'function'
        ? (target.parseConversationId(sessionKey) as string | null)
        : null
    const campaignId =
      conversationId && target.requestContext?.get
        ? ((target.requestContext.get(conversationId) as { campaignId?: string | null } | null)
            ?.campaignId ?? null)
        : null
    const funnelId = String((input.funnel_id as string) ?? '')
    const funnelPageId = String((input.funnel_page_id as string) ?? '')
    const pageName = String((input.name as string) ?? '')
    return [
      `action=${action}`,
      `conversationId=${conversationId ?? 'n/a'}`,
      `campaignId=${campaignId ?? 'n/a'}`,
      `funnelId=${funnelId || 'n/a'}`,
      `funnelPageId=${funnelPageId || 'n/a'}`,
      `pageName=${pageName || 'n/a'}`,
    ].join(' ')
  }

  normalizeFunnelBundleFiles(input: Record<string, unknown>): Array<{
    path: string
    content: string
    role: string
  }> {
    return normalizeBundleFiles(input.files, 'funnel')
  }

  async getOwnedFunnel(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const funnelId = String(input.funnel_id ?? '').trim()
    if (!funnelId) return { error: 'funnel_id is required' } as const
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.funnelsRepository.findFunnel(supabase, {
      funnelId,
      userId,
      columns: 'id, user_id, org_id, name, funnel_type, campaign_id, space_id',
    })
    if (error) throw error
    if (!data) return { error: 'Funnel not found' } as const
    return {
      funnelId,
      userId,
      supabase,
      funnel: data as Record<string, unknown>,
    } as const
  }

  async resolveFunnelPageScope(
    supabase: SupabaseClient,
    funnelId: string,
    input: Record<string, unknown>,
  ): Promise<{ pageId: string | null; sourceMode: string | null } | { error: string }> {
    const raw = input.funnel_page_id ?? input.page_id
    const pageId = typeof raw === 'string' && raw.trim() ? raw.trim() : null
    if (!pageId) return { pageId: null, sourceMode: null }
    const { data, error } = await this.funnelsRepository.findFunnelPageScope(supabase, {
      funnelId,
      funnelPageId: pageId,
    })
    if (error) throw error
    if (!data) return { error: 'Funnel page not found in this funnel' }
    return { pageId, sourceMode: String((data as any).source_mode ?? 'tsx') }
  }

  async writeFunnelFileRows(
    supabase: SupabaseClient,
    funnel: Record<string, unknown>,
    files: Array<{ path: string; content: string; role: string }>,
    funnelPageId: string | null,
    history?: { action: string; label?: string | null },
  ) {
    const results: Record<string, unknown>[] = []
    for (const file of files) {
      const row = {
        funnel_id: funnel.id,
        funnel_page_id: funnelPageId,
        user_id: String(funnel.user_id),
        org_id: (funnel.org_id as string | null | undefined) ?? null,
        path: file.path,
        content: file.content,
        role: file.role,
        mime_type: getBundleMimeType(file.path),
        size_bytes: bundleFileSizeBytes(file.content),
        updated_at: new Date().toISOString(),
      }
      const { data: existing, error: existingError } =
        await this.funnelFilesRepository.findFunnelFile(supabase, {
          funnelId: funnel.id as string,
          funnelPageId,
          path: file.path,
        })
      if (existingError) throw existingError
      if (existing) {
        const { data, error } = await this.funnelFilesRepository.updateFunnelFile(supabase, {
          fileId: (existing as any).id,
          row,
        })
        if (error) throw error
        results.push(data as Record<string, unknown>)
        if (history) {
          await this.funnelHistoryService.recordFileChange(supabase, {
            funnel,
            funnelPageId,
            action: history.action,
            label: history.label ?? `Updated ${file.path}`,
            beforeSnapshot: existing as Record<string, unknown>,
            afterSnapshot: data as Record<string, unknown>,
          })
        }
      } else {
        const { data, error } = await this.funnelFilesRepository.insertFunnelFile(supabase, row)
        if (error) throw error
        results.push(data as Record<string, unknown>)
        if (history) {
          await this.funnelHistoryService.recordFileChange(supabase, {
            funnel,
            funnelPageId,
            action: history.action,
            label: history.label ?? `Created ${file.path}`,
            beforeSnapshot: null,
            afterSnapshot: data as Record<string, unknown>,
          })
        }
      }
    }
    return results
  }

  async replaceFunnelPageFiles(
    supabase: SupabaseClient,
    funnel: Record<string, unknown>,
    funnelPageId: string,
    files: Array<{ path: string; content: string; role: string }>,
  ) {
    const { data: existingRows, error: existingError } =
      await this.funnelFilesRepository.listFunnelPageFiles(supabase, {
        funnelId: funnel.id as string,
        funnelPageId,
      })
    if (existingError) throw existingError

    const existingByPath = new Map(
      ((existingRows ?? []) as Array<Record<string, unknown>>).map((row) => [
        String(row.path),
        row,
      ]),
    )
    const nextPaths = new Set(files.map((file) => file.path))
    const results: Record<string, unknown>[] = []
    const historyItems: NonNullable<
      Awaited<ReturnType<ArtifactFunnelHistoryService['buildFileItem']>>
    >[] = []

    for (const file of files) {
      const beforeSnapshot = existingByPath.get(file.path) ?? null
      const row = {
        funnel_id: funnel.id,
        funnel_page_id: funnelPageId,
        user_id: String(funnel.user_id),
        org_id: (funnel.org_id as string | null | undefined) ?? null,
        path: file.path,
        content: file.content,
        role: file.role,
        mime_type: getBundleMimeType(file.path),
        size_bytes: bundleFileSizeBytes(file.content),
        updated_at: new Date().toISOString(),
      }
      if (beforeSnapshot) {
        const { data, error } = await this.funnelFilesRepository.updateFunnelFile(supabase, {
          fileId: beforeSnapshot.id as string,
          row,
        })
        if (error) throw error
        results.push(data as Record<string, unknown>)
        const item = this.funnelHistoryService.buildFileItem({
          beforeSnapshot,
          afterSnapshot: data as Record<string, unknown>,
          funnelPageId,
        })
        if (item) historyItems.push(item)
      } else {
        const { data, error } = await this.funnelFilesRepository.insertFunnelFile(supabase, row)
        if (error) throw error
        results.push(data as Record<string, unknown>)
        const item = this.funnelHistoryService.buildFileItem({
          beforeSnapshot: null,
          afterSnapshot: data as Record<string, unknown>,
          funnelPageId,
        })
        if (item) historyItems.push(item)
      }
    }

    for (const existing of existingByPath.values()) {
      if (nextPaths.has(String(existing.path))) continue
      const { error } = await this.funnelFilesRepository.deleteFunnelFileById(
        supabase,
        existing.id as string,
      )
      if (error) throw error
      const item = this.funnelHistoryService.buildFileItem({
        beforeSnapshot: existing,
        afterSnapshot: null,
        funnelPageId,
      })
      if (item) historyItems.push(item)
    }

    await this.funnelHistoryService.recordChangeSet(supabase, {
      funnel,
      funnelPageId,
      action: 'replace_funnel_page_bundle',
      label: 'Replaced page bundle',
      metadata: { file_count: files.length },
      items: historyItems,
    })
    return results
  }

  async syncEmailCaptureConversionPointForPage(input: {
    supabase: SupabaseClient
    userId: string
    funnelId: string
    funnelPageId: string
    generatedHtml: string
  }): Promise<void> {
    const hasCapture = this.hasEmailCapture(input.generatedHtml)
    if (hasCapture) {
      const { error } = await this.funnelsRepository.upsertEmailCaptureConversionPoint(
        input.supabase,
        {
          user_id: input.userId,
          funnel_id: input.funnelId,
          funnel_page_id: input.funnelPageId,
          kind: 'email_capture',
          config: {},
          updated_at: new Date().toISOString(),
        },
      )
      if (error) throw error
      return
    }

    const { error } = await this.funnelsRepository.deleteEmailCaptureConversionPoint(
      input.supabase,
      {
        funnelPageId: input.funnelPageId,
        kind: 'email_capture',
      },
    )
    if (error) throw error
  }

  async syncEmailCaptureFromBundleEntry(input: {
    supabase: SupabaseClient
    userId: string
    funnelId: string
    funnelPageId: string
    entryContent: string
  }): Promise<void> {
    await this.syncEmailCaptureConversionPointForPage({
      supabase: input.supabase,
      userId: input.userId,
      funnelId: input.funnelId,
      funnelPageId: input.funnelPageId,
      generatedHtml: input.entryContent,
    })
  }

  async getFunnelKnownPaths(supabase: SupabaseClient, funnelId: string): Promise<string[]> {
    const [{ data: shared }, { data: assets }] = await Promise.all([
      this.funnelFilesRepository.listKnownSharedFiles(supabase, funnelId),
      this.funnelFilesRepository.listKnownAssetPaths(supabase, funnelId),
    ])
    return [
      ...((shared ?? []) as Array<{ path: string }>).map((row) => row.path),
      ...((assets ?? []) as Array<{ path: string }>).map((row) => row.path),
    ]
  }

  async readFileSnapshot(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ) {
    return this.funnelHistoryService.readFileSnapshot(supabase, input)
  }

  async recordFileChange(
    supabase: SupabaseClient,
    input: {
      funnel: Record<string, unknown>
      funnelPageId: string | null
      action: string
      label: string
      beforeSnapshot: Record<string, unknown> | null
      afterSnapshot: Record<string, unknown> | null
    },
  ) {
    return this.funnelHistoryService.recordFileChange(supabase, input)
  }

  private hasEmailCapture(tsxSource: string): boolean {
    const hasForm = /<form\b/i.test(tsxSource)
    const hasEmailInput = /name\s*=\s*["']email["']/i.test(tsxSource)
    if (hasForm && hasEmailInput) return true
    return /\bdata-vibey-capture\b/.test(tsxSource)
  }
}
