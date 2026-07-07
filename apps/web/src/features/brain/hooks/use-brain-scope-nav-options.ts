'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  fetchCompanyCortexStatus,
  fetchCustomerBrainStatus,
} from '@/features/brain/services/brain.service'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents'
import { billingApi } from '@/lib/billing/billing-api'
import { createCachedResource } from '@/lib/cache/cached-resource'
import { fetchCampaigns } from '@/lib/campaigns'
import { orgService, useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { resolveUserAvatarUrl, resolveUserDisplayName } from '@/lib/user-display'
import { getImpersonationFromStorage } from '@/lib/utils/impersonation-storage'

function orgLogoUrlForActiveOrg(activeOrgId: string | null): string | null {
  if (!activeOrgId) return null
  const membership = useOrgStore.getState().memberships.find((m) => m.org_id === activeOrgId)
  return membership?.organizations.avatar_url?.trim() || null
}

export type BrainScopeNavOption = {
  id: string
  label: string
  agentId: string | null
  brainId: string | null
  scopeType:
    | 'user'
    | 'shared'
    | 'agent'
    | 'campaign'
    | 'campaign_knowledge'
    | 'customer'
    | 'company'
  imageUrl?: string | null
  campaignId?: string
  campaignIcon?: string | null
  campaignIconColor?: string | null
  spaceId?: string
  shareLevel?: 'view' | 'query' | 'train'
}

type SharedBrainShareRow = {
  brain_id: string
  level: 'view' | 'query' | 'train'
  created_by: string
  ns_brains: {
    id: string
    name: string | null
    owner_id: string
    scope: string
    image_url: string | null
  } | null
}

type SharedBrainProfile = {
  full_name: string | null
  avatar_url: string | null
}

async function loadOrgMemberProfiles(
  supabase: ReturnType<typeof createClient>,
  activeOrgId: string,
  userIds: string[],
): Promise<Map<string, SharedBrainProfile>> {
  const profileByUserId = new Map<string, SharedBrainProfile>()
  if (userIds.length === 0) return profileByUserId

  try {
    const { members } = await orgService.listMembers(activeOrgId)
    for (const member of members ?? []) {
      if (member.status !== 'active' || !member.user_id) continue
      profileByUserId.set(member.user_id, {
        full_name: member.profiles?.full_name ?? null,
        avatar_url: member.profiles?.avatar_url ?? null,
      })
    }
  } catch {
    // Fall back to direct profile reads for org co-members (RLS).
  }

  const missingIds = userIds.filter((id) => !profileByUserId.has(id))
  if (missingIds.length > 0) {
    // eslint-disable-next-line no-restricted-syntax -- direct profile fallback for shared-brain owner display
    const profilesQuery = supabase.from('profiles')
    const { data: profiles } = await profilesQuery
      .select('id, full_name, avatar_url')
      .in('id', missingIds)
    for (const profile of profiles ?? []) {
      profileByUserId.set(profile.id, {
        full_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url ?? null,
      })
    }
  }

  return profileByUserId
}

function resolveSharedBrainProfile(
  profileByUserId: Map<string, SharedBrainProfile>,
  createdBy: string,
  ownerId: string,
): SharedBrainProfile | undefined {
  return profileByUserId.get(createdBy) ?? profileByUserId.get(ownerId)
}

function sharedBrainLabel(
  brainName: string | null | undefined,
  ownerName: string | null | undefined,
): string {
  const owner = ownerName?.trim()
  const name = brainName?.trim()
  if (name && name !== 'Default Brain') return name
  if (owner) return owner
  return 'Shared Brain'
}

async function loadSharedBrainScopeOptions(
  supabase: ReturnType<typeof createClient>,
  activeOrgId: string,
  currentUserId: string,
): Promise<BrainScopeNavOption[]> {
  // eslint-disable-next-line no-restricted-syntax -- direct brain_shares query for shared-brain nav scope
  const brainSharesQuery = supabase.from('brain_shares')
  const { data, error } = await brainSharesQuery
    .select('brain_id, level, created_by, ns_brains(id, name, owner_id, scope, image_url)')
    .eq('org_id', activeOrgId)

  if (error || !data?.length) return []

  const byBrainId = new Map<
    string,
    {
      brain: NonNullable<SharedBrainShareRow['ns_brains']>
      level: 'view' | 'query' | 'train'
      createdBy: string
    }
  >()

  for (const row of data as unknown as SharedBrainShareRow[]) {
    const brain = row.ns_brains
    if (!brain?.id || brain.owner_id === currentUserId) continue
    const existing = byBrainId.get(brain.id)
    if (!existing || row.level === 'train') {
      byBrainId.set(brain.id, {
        brain,
        level: row.level,
        createdBy: row.created_by,
      })
    }
  }

  if (byBrainId.size === 0) return []

  const profileUserIds = [
    ...new Set([...byBrainId.values()].flatMap((entry) => [entry.createdBy, entry.brain.owner_id])),
  ]
  const profileByUserId = await loadOrgMemberProfiles(supabase, activeOrgId, profileUserIds)

  return [...byBrainId.values()]
    .sort((a, b) => {
      const aProfile = resolveSharedBrainProfile(profileByUserId, a.createdBy, a.brain.owner_id)
      const bProfile = resolveSharedBrainProfile(profileByUserId, b.createdBy, b.brain.owner_id)
      return sharedBrainLabel(a.brain.name, aProfile?.full_name).localeCompare(
        sharedBrainLabel(b.brain.name, bProfile?.full_name),
        undefined,
        { sensitivity: 'base' },
      )
    })
    .map(({ brain, level, createdBy }) => {
      const sharer = resolveSharedBrainProfile(profileByUserId, createdBy, brain.owner_id)
      return {
        id: `shared:${brain.id}`,
        label: sharedBrainLabel(brain.name, sharer?.full_name),
        agentId: null,
        brainId: brain.id,
        scopeType: 'shared' as const,
        imageUrl: brain.image_url?.trim() || sharer?.avatar_url?.trim() || null,
        shareLevel: level,
      }
    })
}

export type BrainScopeNavPayload = {
  scopeOptions: BrainScopeNavOption[]
  agentsWithoutBrain: MissionAgent[]
}

const placeholderPayload: BrainScopeNavPayload = {
  scopeOptions: [
    { id: 'user', label: 'Your Brain', agentId: null, brainId: null, scopeType: 'user' },
  ],
  agentsWithoutBrain: [],
}

const COMPANY_SCOPE_OPTION: BrainScopeNavOption = {
  id: 'company',
  label: 'Company Cortex',
  agentId: null,
  brainId: null,
  scopeType: 'company',
}

function withCompanyScopeOption(
  options: BrainScopeNavOption[],
  isOrg: boolean,
): BrainScopeNavOption[] {
  if (!isOrg) return options.filter((o) => o.scopeType !== 'company')
  if (options.some((o) => o.scopeType === 'company')) return options

  const userIdx = options.findIndex((o) => o.scopeType === 'user')
  if (userIdx === -1) return [COMPANY_SCOPE_OPTION, ...options]
  return [...options.slice(0, userIdx + 1), COMPANY_SCOPE_OPTION, ...options.slice(userIdx + 1)]
}

async function loadBrainScopeNavImpl(activeOrgId: string | null): Promise<BrainScopeNavPayload> {
  // While impersonating, the browser's Supabase JWT is still the superadmin's
  // — direct RLS reads here would surface the superadmin's own rows, not the
  // client's. Identity comes from the impersonation session and the
  // RLS-bound extras (default brain id, shared brains, image overrides) are
  // skipped; backend-routed fetches below are already impersonated.
  const impersonation = getImpersonationFromStorage()
  const supabase = createClient()
  const user = impersonation ? null : (await supabase.auth.getUser()).data.user

  const isOrg = activeOrgId != null
  const orgLogoUrl = orgLogoUrlForActiveOrg(activeOrgId)

  const [
    agents,
    defaultBrainRes,
    customerBrainRes,
    companyCortexRes,
    profileRes,
    sharedBrainRes,
    campaignsRes,
  ] = await Promise.all([
    fetchMissionAgents(),
    user
      ? // eslint-disable-next-line no-restricted-syntax -- direct brain query for scope resolution
        supabase
          .from('ns_brains')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_default', true)
          .eq('scope', 'user')
          .is('org_id', null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    fetchCustomerBrainStatus().catch(() => null),
    activeOrgId ? fetchCompanyCortexStatus().catch(() => null) : Promise.resolve(null),
    user
      ? // eslint-disable-next-line no-restricted-syntax -- direct profile query for nav display name/avatar
        supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    isOrg && user?.id && activeOrgId
      ? loadSharedBrainScopeOptions(supabase, activeOrgId, user.id)
      : Promise.resolve([] as BrainScopeNavOption[]),
    fetchCampaigns().catch(() => []),
  ])

  const companyCustomerBrainIds = [
    companyCortexRes?.brain_id ?? null,
    customerBrainRes?.brain_id ?? null,
  ].filter((id): id is string => !!id)
  const brainImageById = new Map<string, string | null>()
  if (companyCustomerBrainIds.length > 0 && !impersonation) {
    // eslint-disable-next-line no-restricted-syntax -- direct query for per-brain image override
    const { data: imageRows } = await supabase
      .from('ns_brains')
      .select('id, image_url')
      .in('id', companyCustomerBrainIds)
    for (const row of (imageRows ?? []) as Array<{ id: string; image_url: string | null }>) {
      brainImageById.set(row.id, row.image_url?.trim() || null)
    }
  }

  const userLabel = impersonation
    ? impersonation.name || impersonation.email || 'Client Brain'
    : user
      ? resolveUserDisplayName(user, profileRes.data)
      : 'Your Brain'
  const userAvatarUrl = user ? resolveUserAvatarUrl(user, profileRes.data) : null
  const defaultBrainId = defaultBrainRes.data?.id ?? null
  const nonSystemAgents = agents.filter((a) => a.level !== 'system')
  let statuses: Array<{ agent: MissionAgent; hasBrain: boolean; brainId: string | null }>
  try {
    const batchResults = await billingApi.getAgentBrainStatusBatch(
      nonSystemAgents.map((a) => a.agent_key),
    )
    const statusMap = new Map(batchResults.map((s) => [s.agentId, s]))
    statuses = nonSystemAgents.map((agent) => {
      const s = statusMap.get(agent.agent_key)
      return { agent, hasBrain: s?.hasBrain ?? false, brainId: s?.brainId ?? null }
    })
  } catch {
    statuses = nonSystemAgents.map((agent) => ({
      agent,
      hasBrain: false,
      brainId: null,
    }))
  }

  const agentOptions: BrainScopeNavOption[] = statuses
    .filter((entry) => entry.hasBrain)
    .map((entry) => ({
      id: `agent:${entry.agent.agent_key}`,
      label: entry.agent.name,
      agentId: entry.agent.agent_key,
      brainId: entry.brainId,
      scopeType: 'agent' as const,
      imageUrl: entry.agent.image_url?.trim() || null,
    }))

  const agentsWithoutBrain = statuses.filter((entry) => !entry.hasBrain).map((entry) => entry.agent)

  const trainableCampaigns = campaignsRes.filter((campaign) => {
    const config = (campaign.config ?? {}) as Record<string, unknown>
    return config.system_kind !== 'general'
  })

  const campaignBrainByCampaignId = new Map<string, { id: string; imageUrl: string | null }>()
  const campaignIds = trainableCampaigns.map((campaign) => campaign.id)
  if (campaignIds.length > 0 && !impersonation) {
    // eslint-disable-next-line no-restricted-syntax -- direct ns_brains lookup for campaign train targets
    let campaignBrainsQuery = supabase
      .from('ns_brains')
      .select('id, campaign_id, image_url')
      .in('campaign_id', campaignIds)
    if (isOrg && activeOrgId) {
      campaignBrainsQuery = campaignBrainsQuery.eq('org_id', activeOrgId)
    } else {
      campaignBrainsQuery = campaignBrainsQuery.is('org_id', null)
    }
    const { data: campaignBrainRows } = await campaignBrainsQuery
    for (const row of (campaignBrainRows ?? []) as Array<{
      id: string
      campaign_id: string | null
      image_url: string | null
    }>) {
      if (row.campaign_id) {
        campaignBrainByCampaignId.set(String(row.campaign_id), {
          id: String(row.id),
          imageUrl: row.image_url?.trim() || null,
        })
      }
    }
  }

  const campaignKnowledgeOptions: BrainScopeNavOption[] = trainableCampaigns.map((campaign) => {
      const config = (campaign.config ?? {}) as Record<string, unknown>
      const iconImageUrl =
        typeof config.icon_image_url === 'string' && config.icon_image_url.trim()
          ? config.icon_image_url.trim()
          : null
      const icon = typeof config.icon === 'string' && config.icon.trim() ? config.icon : 'brain'
      const iconColor =
        typeof config.icon_color === 'string' && config.icon_color.trim()
          ? config.icon_color
          : 'purple'
      const campaignBrain = campaignBrainByCampaignId.get(campaign.id)
      return {
        id: `campaign:${campaign.id}`,
        label: `${campaign.name ?? 'Campaign'} Knowledge`,
        agentId: null,
        brainId: campaignBrain?.id ?? null,
        scopeType: 'campaign_knowledge' as const,
        campaignId: campaign.id,
        imageUrl: iconImageUrl ?? campaignBrain?.imageUrl ?? null,
        campaignIcon: icon,
        campaignIconColor: iconColor,
      }
    })

  const scopeOptions: BrainScopeNavOption[] = [
    {
      id: 'user',
      label: userLabel,
      agentId: null,
      brainId: defaultBrainId,
      scopeType: 'user',
      imageUrl: userAvatarUrl,
    },
    ...sharedBrainRes,
    ...(isOrg
      ? [
          {
            id: 'company',
            label: 'Company Cortex',
            agentId: null,
            brainId: companyCortexRes?.brain_id ?? null,
            scopeType: 'company' as const,
            imageUrl:
              (companyCortexRes?.brain_id
                ? (brainImageById.get(companyCortexRes.brain_id) ?? null)
                : null) ?? orgLogoUrl,
          },
        ]
      : []),
    ...(customerBrainRes?.enabled && customerBrainRes.brain_id
      ? [
          {
            id: 'customer',
            label: 'Customer Brain',
            agentId: null,
            brainId: customerBrainRes.brain_id,
            scopeType: 'customer' as const,
            imageUrl: brainImageById.get(customerBrainRes.brain_id) ?? orgLogoUrl,
          },
        ]
      : []),
    ...agentOptions,
    ...campaignKnowledgeOptions,
  ]

  return {
    scopeOptions: withCompanyScopeOption(scopeOptions, isOrg),
    agentsWithoutBrain,
  }
}

async function fetchBrainScopeNavPayload(): Promise<BrainScopeNavPayload> {
  const activeOrgId = useOrgStore.getState().activeOrgId
  try {
    return await loadBrainScopeNavImpl(activeOrgId)
  } catch {
    const impersonation = getImpersonationFromStorage()
    const isOrg = activeOrgId != null
    if (impersonation) {
      return {
        scopeOptions: withCompanyScopeOption(
          [
            {
              id: 'user',
              label: impersonation.name || impersonation.email || 'Client Brain',
              agentId: null,
              brainId: null,
              scopeType: 'user',
              imageUrl: null,
            },
          ],
          isOrg,
        ),
        agentsWithoutBrain: [],
      }
    }
    const supabaseFallback = createClient()
    const {
      data: { user },
    } = await supabaseFallback.auth.getUser()
    // eslint-disable-next-line no-restricted-syntax -- direct brain fallback query
    const { data: fb } = await supabaseFallback
      .from('ns_brains')
      .select('id')
      .eq('owner_id', user?.id ?? '')
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
    const userAvatarUrl = user ? resolveUserAvatarUrl(user, null) : null
    return {
      scopeOptions: withCompanyScopeOption(
        [
          {
            id: 'user',
            label: user ? resolveUserDisplayName(user, null) : 'Your Brain',
            agentId: null,
            brainId: fb?.id ?? null,
            scopeType: 'user',
            imageUrl: userAvatarUrl,
          },
        ],
        isOrg,
      ),
      agentsWithoutBrain: [],
    }
  }
}

/** Same TTL as `useCachedSpaces` / sidebar team2 bootstrap — stale-while-revalidate in flyout + Brain page. */
const brainScopeNavResource = createCachedResource<BrainScopeNavPayload>(
  fetchBrainScopeNavPayload,
  {
    ttlMs: 60_000,
  },
)

export const cachedBrainScopeNav = {
  invalidate: () => brainScopeNavResource.invalidate(),
  reload: () => brainScopeNavResource.reload(),
  peek: () => brainScopeNavResource.peek(),
  mutate: (
    next: BrainScopeNavPayload | ((prev: BrainScopeNavPayload | undefined) => BrainScopeNavPayload),
  ) => brainScopeNavResource.mutate(next),
}

/**
 * Last `activeOrgId` the nav resource was loaded for. `undefined` = never seen.
 * Module-level (not a per-hook ref) because five consumers share
 * `brainScopeNavResource` — a consumer mounting after an org switch must still
 * detect the change even though it wasn't mounted when it happened.
 */
let lastSeenActiveOrgId: string | null | undefined

export function useBrainScopeNavOptions(enabled = true) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const isOrg = activeOrgId != null

  // Hard-invalidate only when the org actually CHANGES from a previously seen
  // value. Running invalidate()+reload() on every mount defeated the 60s TTL —
  // each /brain visit and flyout open replayed the full scope-nav waterfall.
  useEffect(() => {
    if (lastSeenActiveOrgId === undefined) {
      lastSeenActiveOrgId = activeOrgId
      return
    }
    if (lastSeenActiveOrgId === activeOrgId) return
    lastSeenActiveOrgId = activeOrgId
    brainScopeNavResource.invalidate()
    void brainScopeNavResource.reload()
  }, [activeOrgId])

  const { data, loading, reload } = brainScopeNavResource.use({ enabled })
  const resolved = data != null

  const scopeOptions = useMemo(
    () => withCompanyScopeOption(data?.scopeOptions ?? placeholderPayload.scopeOptions, isOrg),
    [data?.scopeOptions, isOrg],
  )
  const agentsWithoutBrain = data?.agentsWithoutBrain ?? placeholderPayload.agentsWithoutBrain

  /** Bust TTL and refetch (e.g. after activating an agent brain). */
  const reloadScopeNav = useCallback(async () => {
    brainScopeNavResource.invalidate()
    await reload()
  }, [reload])

  return {
    scopeOptions,
    agentsWithoutBrain,
    loading,
    resolved,
    usingPlaceholder: !resolved,
    reload: reloadScopeNav,
  }
}
