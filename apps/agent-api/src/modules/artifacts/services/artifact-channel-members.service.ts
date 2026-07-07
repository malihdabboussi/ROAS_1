import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactChannelMembersRepository } from '../repositories/artifact-channel-members.repository'

export class ArtifactChannelMembersService {
  constructor(
    private readonly repository: ArtifactChannelMembersRepository = new ArtifactChannelMembersRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      save_member_note: (data, sessionKey) => this.saveMemberNote(target, data, sessionKey),
      get_member_notes: (data, sessionKey) => this.getMemberNotes(target, data, sessionKey),
    }
  }

  private async saveMemberNote(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const note = typeof input.note === 'string' ? input.note.trim() : ''
    if (!note) return { success: false, error: 'note is required (non-empty string)' }

    const conversationId = target.parseConversationId?.(sessionKey ?? '')
    if (!conversationId) return { success: false, error: 'No active conversation context' }

    const ctx = target.requestContext?.get(conversationId)
    if (!ctx?.channelMember?.platform_id) {
      return {
        success: false,
        error: 'No channel member in current conversation (only available in Slack/Telegram)',
      }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null

    const supabase = target.serviceClient ?? target.svc?.client
    if (!supabase) return { success: false, error: 'Database unavailable' }
    const platform = ctx.channel === 'telegram' ? 'telegram' : 'slack'

    const { data: member, error: fetchError } = await this.repository.findMemberForNotes(
      supabase,
      {
        userId,
        platformId: ctx.channelMember.platform_id,
        platform,
      },
    )

    if (fetchError) return { success: false, error: fetchError.message }
    if (!member) return { success: false, error: 'Channel member not found' }

    const existingNotes = Array.isArray(member.notes) ? member.notes : []
    const newNote = { content: note, saved_at: new Date().toISOString() }
    const updatedNotes = [...existingNotes, newNote]

    const { error: updateError } = await this.repository.updateMemberNotes(supabase, {
      memberId: String(member.id),
      notes: updatedNotes,
    })

    if (updateError) return { success: false, error: updateError.message }
    return { success: true, notes_count: updatedNotes.length }
  }

  private async getMemberNotes(
    target: Record<string, any>,
    _input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const conversationId = target.parseConversationId?.(sessionKey ?? '')
    if (!conversationId) return { success: false, error: 'No active conversation context' }

    const ctx = target.requestContext?.get(conversationId)
    if (!ctx?.channelMember?.platform_id) {
      return {
        success: false,
        error: 'No channel member in current conversation (only available in Slack/Telegram)',
      }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = target.serviceClient ?? target.svc?.client
    if (!supabase) return { success: false, error: 'Database unavailable' }
    const platform = ctx.channel === 'telegram' ? 'telegram' : 'slack'

    const { data: member, error } = await this.repository.findMemberProfile(supabase, {
      userId,
      platformId: ctx.channelMember.platform_id,
      platform,
    })

    if (error) return { success: false, error: error.message }
    if (!member) return { success: true, notes: [], profile: null }

    return {
      success: true,
      profile: {
        display_name: member.display_name,
        username: member.username,
        title: member.title,
        timezone: member.timezone,
      },
      notes: Array.isArray(member.notes) ? member.notes : [],
    }
  }
}
