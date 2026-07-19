import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ContactIdentifierService } from '../../leads/services/contact-identifier.service'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRuntimeRepository } from '../repositories/slack-runtime.repository'
import type { SlackResolvedSender } from '../types/slack.types'

const CUSTOMER_BRAIN_CONTACT_ROLES = new Set(['customer', 'lead', 'team_of_customer'])

type SlackMember = {
  id: string
  name?: string
  real_name?: string
  profile?: {
    display_name?: string
    real_name?: string
    email?: string
    image_72?: string
    title?: string
  }
  deleted?: boolean
  is_bot?: boolean
}

@Injectable()
export class SlackSenderResolverService {
  constructor(
    private readonly contactIdentifiers: ContactIdentifierService,
    private readonly slackApi: SlackApiIntegration,
    private readonly slackRuntimeRepo: SlackRuntimeRepository,
  ) {}

  async resolveSlackSenders(
    supabase: SupabaseClient,
    input: {
      botToken: string
      userId: string
      orgId?: string | null
      slackUserIds: string[]
    },
  ): Promise<Map<string, SlackResolvedSender>> {
    const uniqueIds = [...new Set(input.slackUserIds.filter(Boolean))]
    const users = await this.loadSlackUsers(input.botToken, uniqueIds)
    const byEmail = await this.loadOrgMembersByEmail(supabase, input.orgId)
    const out = new Map<string, SlackResolvedSender>()

    for (const slackUserId of uniqueIds) {
      const slackUser = users.get(slackUserId)
      const email = this.extractEmail(slackUser)
      const owner = { userId: input.userId, orgId: input.orgId ?? null }
      const contact =
        (await this.contactIdentifiers.resolveByKind(
          supabase,
          owner,
          'slack_user_id',
          slackUserId,
        )) ??
        (email
          ? await this.contactIdentifiers.resolveByKind(supabase, owner, 'email', email)
          : null)
      if (contact && email) {
        await this.contactIdentifiers.attachIdentifier(supabase, {
          contactId: contact.id,
          owner,
          kind: 'slack_user_id',
          value: slackUserId,
          confidence: 1,
          source: 'slack-discovery',
        })
      }

      const role = contact?.contact_type ?? null
      const vibeyUserId = email ? (byEmail.get(email.toLowerCase()) ?? null) : null
      await this.slackRuntimeRepo.upsertResolvedSlackPerson(supabase, {
        user_id: input.userId,
        org_id: input.orgId ?? null,
        platform: 'slack',
        platform_id: slackUserId,
        display_name: this.displayName(slackUser, slackUserId),
        username: slackUser?.name ?? null,
        avatar_url: slackUser?.profile?.image_72 ?? null,
        title: slackUser?.profile?.title ?? null,
        timezone: null,
        email,
        is_bot: slackUser?.is_bot ?? false,
        vibey_user_id: vibeyUserId,
        contact_id: contact?.id ?? null,
        relationship_kind: vibeyUserId ? 'team_member' : contact ? 'external' : 'unknown',
      })
      out.set(slackUserId, {
        slackUserId,
        displayName: this.displayName(slackUser, slackUserId),
        email,
        contactId: contact?.id ?? null,
        contactRole: role,
        qualifiesForCustomerBrain: role ? CUSTOMER_BRAIN_CONTACT_ROLES.has(role) : false,
        vibeyUserId,
      })
    }

    return out
  }

  async seedContactIdentifiersFromWorkspace(
    supabase: SupabaseClient,
    input: { botToken: string; userId: string; orgId?: string | null },
  ): Promise<{ seeded: number; members: SlackResolvedSender[] }> {
    const members = (await this.slackApi.listUsers(input.botToken)) as SlackMember[]
    const realMemberIds = members
      .filter(
        (member) => member.id && !member.deleted && !member.is_bot && member.id !== 'USLACKBOT',
      )
      .map((member) => member.id)
    const resolved = await this.resolveSlackSenders(supabase, {
      botToken: input.botToken,
      userId: input.userId,
      orgId: input.orgId,
      slackUserIds: realMemberIds,
    })
    const seeded = [...resolved.values()].filter((sender) => sender.contactId).length
    return { seeded, members: [...resolved.values()] }
  }

  private async loadSlackUsers(
    botToken: string,
    slackUserIds: string[],
  ): Promise<Map<string, SlackMember>> {
    const map = new Map<string, SlackMember>()
    const allUsers = (await this.slackApi.listUsers(botToken)) as SlackMember[]
    for (const member of allUsers) {
      if (member.id && slackUserIds.includes(member.id)) map.set(member.id, member)
    }
    for (const slackUserId of slackUserIds) {
      if (map.has(slackUserId)) continue
      const info = (await this.slackApi.getUserInfo(botToken, slackUserId)) as SlackMember | null
      if (info?.id) map.set(slackUserId, info)
    }
    return map
  }

  private async loadOrgMembersByEmail(
    supabase: SupabaseClient,
    orgId?: string | null,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (!orgId) return map
    let rows: Awaited<ReturnType<SlackRuntimeRepository['listActiveOrgMembersWithProfileEmails']>>
    try {
      rows = await this.slackRuntimeRepo.listActiveOrgMembersWithProfileEmails(supabase, orgId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to load org members for Slack sender resolution: ${message}`)
    }
    for (const row of rows) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const email = profile?.email
      const userId = row.user_id
      if (email && userId) map.set(email.toLowerCase(), userId)
    }
    return map
  }

  private extractEmail(member: SlackMember | undefined): string | null {
    const email = member?.profile?.email?.trim().toLowerCase()
    return email || null
  }

  private displayName(member: SlackMember | undefined, fallback: string): string {
    return (
      member?.profile?.display_name ||
      member?.profile?.real_name ||
      member?.real_name ||
      member?.name ||
      fallback
    )
  }
}
