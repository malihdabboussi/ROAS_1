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
  is_restricted?: boolean
  is_ultra_restricted?: boolean
}

type OrgIdentityMaps = {
  byEmail: Map<string, string>
  uniqueByName: Map<string, string>
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
    const orgIdentities = await this.loadOrgMemberIdentities(supabase, input.orgId)
    const existingIdentityRows = await this.slackRuntimeRepo.listSlackIdentityState(supabase, {
      userId: input.userId,
      orgId: input.orgId,
      platformIds: uniqueIds,
    })
    const existingIdentityBySlackId = new Map(
      existingIdentityRows.map((row) => [row.platform_id, row]),
    )
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
      const existingIdentity = existingIdentityBySlackId.get(slackUserId)
      const emailMatchedUserId = email
        ? (orgIdentities.byEmail.get(email.toLowerCase()) ?? null)
        : null
      const confirmedNameUserId =
        existingIdentity?.identity_match_method === 'confirmed_name'
          ? existingIdentity.vibey_user_id
          : null
      const vibeyUserId = emailMatchedUserId ?? confirmedNameUserId
      const suggestedVibeyUserId = vibeyUserId
        ? null
        : (orgIdentities.uniqueByName.get(
            this.normalizeName(this.displayName(slackUser, slackUserId)),
          ) ?? null)
      const identityMatchMethod = emailMatchedUserId
        ? 'email'
        : confirmedNameUserId
          ? 'confirmed_name'
          : suggestedVibeyUserId
            ? 'suggested_name'
            : 'none'
      const inferredRelationship = vibeyUserId
        ? 'internal'
        : role && CUSTOMER_BRAIN_CONTACT_ROLES.has(role)
          ? 'external'
          : slackUser?.is_restricted || slackUser?.is_ultra_restricted
            ? 'external'
            : (existingIdentity?.relationship_kind ?? 'external')
      const relationshipKind =
        existingIdentity?.relationship_source === 'manual'
          ? existingIdentity.relationship_kind
          : inferredRelationship
      const relationshipSource =
        existingIdentity?.relationship_source === 'manual' ? 'manual' : 'inferred'
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
        suggested_vibey_user_id: suggestedVibeyUserId,
        contact_id: contact?.id ?? null,
        relationship_kind: relationshipKind,
        relationship_source: relationshipSource,
        identity_match_method: identityMatchMethod,
        identity_match_confidence: vibeyUserId ? 1 : suggestedVibeyUserId ? 0.95 : 0,
      })
      out.set(slackUserId, {
        slackUserId,
        displayName: this.displayName(slackUser, slackUserId),
        email,
        contactId: contact?.id ?? null,
        contactRole: role,
        qualifiesForCustomerBrain: role ? CUSTOMER_BRAIN_CONTACT_ROLES.has(role) : false,
        vibeyUserId,
        personBrainId: existingIdentity?.person_brain_id ?? null,
        relationshipKind: relationshipKind as 'internal' | 'external' | 'ignored',
      })
    }

    return out
  }

  async seedContactIdentifiersFromWorkspace(
    supabase: SupabaseClient,
    input: { botToken: string; userId: string; orgId?: string | null },
  ): Promise<{
    seeded: number
    members: SlackResolvedSender[]
    channelNamesByMember: Map<string, string[]>
  }> {
    const members = (await this.slackApi.listUsers(input.botToken)) as SlackMember[]
    const realMemberIds = members
      .filter(
        (member) => member.id && !member.deleted && !member.is_bot && member.id !== 'USLACKBOT',
      )
      .map((member) => member.id)
    const [resolved, channelNamesByMember] = await Promise.all([
      this.resolveSlackSenders(supabase, {
        botToken: input.botToken,
        userId: input.userId,
        orgId: input.orgId,
        slackUserIds: realMemberIds,
      }),
      this.loadChannelNamesByMember(input.botToken, realMemberIds),
    ])
    const seeded = [...resolved.values()].filter((sender) => sender.contactId).length
    return { seeded, members: [...resolved.values()], channelNamesByMember }
  }

  private async loadChannelNamesByMember(
    botToken: string,
    slackUserIds: string[],
  ): Promise<Map<string, string[]>> {
    const namesByMember = new Map(slackUserIds.map((id) => [id, [] as string[]]))
    const knownMemberIds = new Set(slackUserIds)
    const channels = await this.slackApi.listConversations(botToken)
    const batchSize = 8
    for (let index = 0; index < channels.length; index += batchSize) {
      const batch = channels.slice(index, index + batchSize)
      const memberships = await Promise.all(
        batch.map(async (channel) => ({
          channel,
          memberIds: await this.slackApi.listConversationMembers(botToken, channel.id),
        })),
      )
      for (const { channel, memberIds } of memberships) {
        for (const memberId of memberIds) {
          if (!knownMemberIds.has(memberId)) continue
          namesByMember.get(memberId)?.push(channel.name)
        }
      }
    }
    for (const names of namesByMember.values()) names.sort((a, b) => a.localeCompare(b))
    return namesByMember
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

  private async loadOrgMemberIdentities(
    supabase: SupabaseClient,
    orgId?: string | null,
  ): Promise<OrgIdentityMaps> {
    const byEmail = new Map<string, string>()
    const nameCandidates = new Map<string, string[]>()
    if (!orgId) return { byEmail, uniqueByName: new Map() }
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
      if (email && userId) byEmail.set(email.toLowerCase(), userId)
      const normalizedName = this.normalizeName(profile?.full_name)
      if (normalizedName && userId) {
        nameCandidates.set(normalizedName, [...(nameCandidates.get(normalizedName) ?? []), userId])
      }
    }
    const uniqueByName = new Map<string, string>()
    for (const [name, userIds] of nameCandidates.entries()) {
      if (userIds.length === 1 && userIds[0]) uniqueByName.set(name, userIds[0])
    }
    return { byEmail, uniqueByName }
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

  private normalizeName(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }
}
