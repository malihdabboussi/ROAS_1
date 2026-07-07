import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceShareLevel } from '../dto'
import { SpacePublicShareRepository } from '../repositories/space-public-share.repository'
import type {
  SharedItemResolveResult,
  SharedSpaceLite,
  SharedSpaceResolveResult,
  SharedSpaceRosterEntry,
} from './space-permissions.types'

@Injectable()
export class SpacePublicShareResolverService {
  constructor(
    @Optional()
    private readonly repo: SpacePublicShareRepository = new SpacePublicShareRepository(),
  ) {}

  async resolvePublicSharedItemByToken(token: string): Promise<SharedItemResolveResult | null> {
    return this.resolveSharedItemByToken(this.repo.getServiceSupabaseClient(), token)
  }

  async resolveSharedItemByToken(
    supabase: SupabaseClient,
    token: string,
  ): Promise<SharedItemResolveResult | null> {
    const publicItem = await this.repo.findPublicItemByToken(supabase, token)
    if (publicItem) {
      const publicSpace = await this.repo.findSharedSpaceLite(
        supabase,
        publicItem.space_id as string,
      )
      if (!publicSpace) return null
      return {
        share_type: 'public',
        access_level: 'view',
        space: publicSpace as SharedSpaceLite,
        item: this.sanitizeSharedItemRow(publicItem),
      }
    }

    const emailInvite = await this.repo.findEmailInviteByToken(supabase, token)
    if (!emailInvite) return null

    if (emailInvite.invite_expires_at) {
      const expiresAt = new Date(emailInvite.invite_expires_at as string).getTime()
      if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) return null
    }

    const invitedItem = await this.repo.findInvitedItem(
      supabase,
      emailInvite.item_id as string,
      emailInvite.space_id as string,
    )
    if (!invitedItem) return null

    const invitedSpace = await this.repo.findSharedSpaceLite(
      supabase,
      emailInvite.space_id as string,
    )
    if (!invitedSpace) return null

    return {
      share_type: 'invite',
      access_level: (emailInvite.level as SpaceShareLevel) ?? 'view',
      space: invitedSpace as SharedSpaceLite,
      item: this.sanitizeSharedItemRow(invitedItem),
    }
  }

  async resolveSharedSpaceByToken(
    supabase: SupabaseClient,
    token: string,
  ): Promise<SharedSpaceResolveResult | null> {
    const space = await this.repo.findSharedSpaceByToken(supabase, token)
    if (!space) return null

    const itemRows = await this.repo.listPublicSpaceItems(supabase, space.id as string)
    const campaign = await this.loadSharedCampaign(supabase, space)
    const campaignId = space.campaign_id as string | null | undefined
    const sharedItems = campaignId
      ? [...itemRows, ...(await this.loadSharedCampaignDocs(supabase, campaignId, space, itemRows))]
      : itemRows
    const roster = await this.loadSharedSpaceRoster(supabase, space, sharedItems)

    return {
      access_level: 'view',
      space,
      items: sharedItems,
      roster,
      campaign,
    }
  }

  private sanitizeSharedItemRow(row: Record<string, unknown>): Record<string, unknown> {
    const customData =
      row.custom_data && typeof row.custom_data === 'object' && !Array.isArray(row.custom_data)
        ? (row.custom_data as Record<string, unknown>)
        : {}
    const docFlags: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(customData)) {
      if (key.startsWith('_doc_')) docFlags[key] = value
    }
    return { ...row, custom_data: docFlags }
  }

  private async loadSharedCampaign(
    supabase: SupabaseClient,
    spaceRow: Record<string, unknown>,
  ): Promise<{ id: string; name: string } | null> {
    const campaignId = spaceRow.campaign_id as string | null | undefined
    if (!campaignId) return null
    const campRow = await this.repo.findCampaignLite(supabase, campaignId)
    if (!campRow || typeof (campRow as { id?: string }).id !== 'string') return null
    const cr = campRow as { id: string; name: string }
    return { id: cr.id, name: typeof cr.name === 'string' ? cr.name : '' }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private textToHtml(value: string | null | undefined): string | null {
    if (!value) return null
    if (/<[a-z][\s\S]*>/i.test(value)) return value
    return `<p>${this.escapeHtml(value)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br />')}</p>`
  }

  private resolveConversationDocumentDocSource(row: Record<string, unknown>): string {
    const conversation =
      row.conversations &&
      typeof row.conversations === 'object' &&
      !Array.isArray(row.conversations)
        ? (row.conversations as Record<string, unknown>)
        : null
    const conversationMetadata =
      conversation?.metadata &&
      typeof conversation.metadata === 'object' &&
      !Array.isArray(conversation.metadata)
        ? (conversation.metadata as Record<string, unknown>)
        : null
    const conversationSource =
      typeof conversationMetadata?.source === 'string' ? conversationMetadata.source : null
    if (conversationSource === 'channel_tool') return 'channel'
    if (conversationSource === 'dm' || conversationSource === 'direct_message') return 'dm'
    if (conversationSource === 'studio') return 'studio'
    return typeof row.conversation_id === 'string' && row.conversation_id.length > 0
      ? 'dm'
      : 'studio'
  }

  private async loadSharedCampaignDocs(
    supabase: SupabaseClient,
    campaignId: string,
    spaceRow: Record<string, unknown>,
    spaceItems: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> {
    const existingSourceIds = new Set(
      spaceItems
        .map((item) => {
          const customData = item.custom_data
          if (!customData || typeof customData !== 'object' || Array.isArray(customData))
            return null
          const sourceId = (customData as Record<string, unknown>)._source_id
          return typeof sourceId === 'string' ? sourceId : null
        })
        .filter((sourceId): sourceId is string => Boolean(sourceId)),
    )
    const [documents, deliverables] = await Promise.all([
      this.repo.listConversationDocuments(supabase, campaignId),
      this.repo.listMissionDeliverables(supabase, campaignId),
    ])
    return [
      ...this.mapConversationDocuments(documents, existingSourceIds, spaceRow),
      ...this.mapMissionDeliverables(deliverables, existingSourceIds, spaceRow),
    ]
  }

  private mapConversationDocuments(
    documents: Record<string, unknown>[],
    existingSourceIds: Set<string>,
    spaceRow: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = []
    const mediaDocTypes = new Set(['image_upload'])
    for (const row of documents) {
      const documentType = typeof row.document_type === 'string' ? row.document_type : ''
      const sourceId = String(row.id ?? '')
      if (mediaDocTypes.has(documentType) || !sourceId || existingSourceIds.has(sourceId)) continue
      const content =
        row.content && typeof row.content === 'object' && !Array.isArray(row.content)
          ? (row.content as Record<string, unknown>)
          : {}
      const rawContent =
        (content.html as string | undefined) ??
        (content.source_content as string | undefined) ??
        (content.text as string | undefined) ??
        null
      out.push(
        this.createSharedDocRow(row, spaceRow, {
          id: `cdoc:${sourceId}`,
          title: typeof row.title === 'string' && row.title.trim() ? row.title : documentType,
          body: rawContent,
          docSource: this.resolveConversationDocumentDocSource(row),
          docType: documentType,
          sourceId,
        }),
      )
    }
    return out
  }

  private mapMissionDeliverables(
    deliverables: Record<string, unknown>[],
    existingSourceIds: Set<string>,
    spaceRow: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = []
    const deliverableDocTypes = new Set(['doc', 'text', 'pdf', 'file'])
    for (const row of deliverables) {
      const type = typeof row.type === 'string' ? row.type : ''
      const sourceId = String(row.id ?? '')
      if (!deliverableDocTypes.has(type) || !sourceId || existingSourceIds.has(sourceId)) continue
      out.push(
        this.createSharedDocRow(row, spaceRow, {
          id: `mdel:${sourceId}`,
          title: typeof row.title === 'string' && row.title.trim() ? row.title : 'Mission document',
          body: typeof row.content === 'string' ? row.content : null,
          docSource: 'mission',
          docType: type,
          sourceId,
          linkedMissionId: typeof row.mission_id === 'string' ? row.mission_id : null,
          userId: typeof row.user_id === 'string' ? row.user_id : undefined,
        }),
      )
    }
    return out
  }

  private createSharedDocRow(
    row: Record<string, unknown>,
    spaceRow: Record<string, unknown>,
    input: {
      id: string
      title: string
      body: string | null
      docSource: string
      docType: string
      sourceId: string
      linkedMissionId?: string | null
      userId?: string
    },
  ): Record<string, unknown> {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const coverUrl =
      typeof metadata._doc_cover_url === 'string' && metadata._doc_cover_url.trim()
        ? metadata._doc_cover_url
        : undefined
    const docStatus =
      typeof metadata._space_item_status === 'string' && metadata._space_item_status.trim()
        ? metadata._space_item_status
        : 'todo'
    const now = new Date().toISOString()
    return {
      id: input.id,
      space_id: String(spaceRow.id ?? ''),
      org_id: (spaceRow.org_id as string | null | undefined) ?? null,
      user_id: input.userId ?? String(spaceRow.user_id ?? ''),
      title: input.title || 'Untitled',
      status: docStatus,
      priority: null,
      assignee_type: 'unassigned',
      assignee_id: null,
      start_date: null,
      due_date: null,
      recurrence: null,
      parent_item_id: null,
      recurrence_parent_id: null,
      notes: null,
      doc_body: this.textToHtml(input.body),
      source: 'manual',
      linked_mission_id: input.linkedMissionId ?? null,
      task_execution_status: null,
      sort_order: 0,
      custom_data: {
        _view_type: 'doc',
        _doc_source: input.docSource,
        _doc_type: input.docType,
        _source_id: input.sourceId,
        ...(coverUrl ? { _doc_cover_url: coverUrl } : {}),
      },
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? row.created_at ?? now,
    }
  }

  private collectAssigneeRefsFromItems(items: Record<string, unknown>[]) {
    const humanUserIds = new Set<string>()
    const agentKeys = new Set<string>()
    for (const row of items) {
      const assigneeType = typeof row.assignee_type === 'string' ? row.assignee_type : ''
      const assigneeId =
        typeof row.assignee_id === 'string'
          ? row.assignee_id
          : row.assignee_id == null
            ? null
            : String(row.assignee_id)
      if (!assigneeId || assigneeType === 'unassigned' || assigneeType === '') continue
      if (assigneeType === 'human') humanUserIds.add(assigneeId)
      if (assigneeType === 'agent') agentKeys.add(assigneeId)
    }
    return { humanUserIds: [...humanUserIds], agentKeys: [...agentKeys] }
  }

  private async loadSharedSpaceRoster(
    supabase: SupabaseClient,
    spaceRow: Record<string, unknown>,
    items: Record<string, unknown>[],
  ): Promise<SharedSpaceRosterEntry[]> {
    const { humanUserIds, agentKeys } = this.collectAssigneeRefsFromItems(items)
    const orgId = (spaceRow.org_id as string | null | undefined) ?? null
    const spaceUserId = typeof spaceRow.user_id === 'string' ? spaceRow.user_id : ''
    const out: SharedSpaceRosterEntry[] = []
    const seen = new Set<string>()
    const pushEntry = (entry: SharedSpaceRosterEntry) => {
      if (seen.has(entry.participant_id)) return
      seen.add(entry.participant_id)
      out.push(entry)
    }

    if (orgId) {
      await this.loadOrgRosterEntries(supabase, orgId, humanUserIds, agentKeys, pushEntry)
      return out
    }
    await this.loadPersonalAgentRosterEntries(supabase, spaceUserId, agentKeys, pushEntry)
    await this.loadPersonalHumanRosterEntries(supabase, humanUserIds, pushEntry)
    return out
  }

  private async loadOrgRosterEntries(
    supabase: SupabaseClient,
    orgId: string,
    humanUserIds: string[],
    agentKeys: string[],
    pushEntry: (entry: SharedSpaceRosterEntry) => void,
  ) {
    const humanRows = await this.repo.listOrgRosterEntries(
      supabase,
      orgId,
      'human',
      'user_id',
      humanUserIds,
    )
    for (const row of humanRows) pushEntry(this.mapRosterRow(row))

    const agentRows = await this.repo.listOrgRosterEntries(
      supabase,
      orgId,
      'agent',
      'agent_key',
      agentKeys,
    )
    for (const row of agentRows) pushEntry(this.mapRosterRow(row))
  }

  private async loadPersonalAgentRosterEntries(
    supabase: SupabaseClient,
    spaceUserId: string,
    agentKeys: string[],
    pushEntry: (entry: SharedSpaceRosterEntry) => void,
  ) {
    const rows = await this.repo.listPersonalAgentRosterEntries(supabase, spaceUserId, agentKeys)
    for (const row of rows) {
      const key = typeof row.agent_key === 'string' ? row.agent_key : ''
      if (!key) continue
      pushEntry({
        participant_id: typeof row.id === 'string' ? row.id : String(row.id ?? key),
        kind: 'agent',
        display_name: typeof row.name === 'string' && row.name.trim().length > 0 ? row.name : key,
        avatar_url: typeof row.image_url === 'string' ? row.image_url : null,
        user_id: null,
        agent_key: key,
      })
    }
  }

  private async loadPersonalHumanRosterEntries(
    supabase: SupabaseClient,
    humanUserIds: string[],
    pushEntry: (entry: SharedSpaceRosterEntry) => void,
  ) {
    const rows = await this.repo.listPersonalHumanRosterEntries(supabase, humanUserIds)
    for (const row of rows) {
      const uid = typeof row.id === 'string' ? row.id : String(row.id ?? '')
      if (!uid) continue
      pushEntry({
        participant_id: uid,
        kind: 'human',
        display_name:
          typeof row.full_name === 'string' && row.full_name.trim().length > 0
            ? row.full_name
            : 'Teammate',
        avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
        user_id: uid,
        agent_key: null,
      })
    }
  }

  private mapRosterRow(row: Record<string, unknown>): SharedSpaceRosterEntry {
    const kind = row.kind === 'agent' ? 'agent' : 'human'
    return {
      participant_id: String(row.participant_id ?? ''),
      kind,
      display_name:
        typeof row.display_name === 'string'
          ? row.display_name
          : kind === 'agent'
            ? 'Agent'
            : 'Teammate',
      avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      user_id: typeof row.user_id === 'string' ? row.user_id : null,
      agent_key: typeof row.agent_key === 'string' ? row.agent_key : null,
    }
  }
}
