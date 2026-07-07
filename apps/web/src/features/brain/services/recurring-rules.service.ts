'use client'

import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'
import {
  fetchCompanyCortexStatus,
  updateCompanyCortexSettings,
  type CompanyCortexSchedule,
  type CompanyCortexSettings,
} from './brain.service'

export type RecurringTrainingKind =
  | 'all'
  | 'slack'
  | 'fathom_auto'
  | 'fireflies_sync'
  | 'zoom_auto'
  | 'company_dream'

export type RecurringTrainingCadence =
  | 'realtime'
  | 'manual'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'weekdays'
  | 'manual_only'
  | 'unknown'

export type RecurringTrainingTargetKind = 'user' | 'campaign' | 'agent' | 'customer' | 'workspace'

export type SlackTrainingDestination = {
  id: string
  label: string
  targetKind: Exclude<RecurringTrainingTargetKind, 'customer' | 'workspace'>
  targetBrainId?: string | null
  targetCampaignId?: string | null
}

export type SlackTrainingMapping = {
  id: string
  slack_channel_id: string
  slack_channel_name: string
  target_kind: Exclude<RecurringTrainingTargetKind, 'workspace'>
  target_brain_id: string | null
  target_campaign_id: string | null
  cadence: Extract<RecurringTrainingCadence, 'daily' | 'weekly' | 'monthly'>
  last_synced_at: string | null
  enabled: boolean
}

export type SlackTrainingSender = {
  slackUserId: string
  displayName: string
  email: string | null
  contactId: string | null
  contactRole: string | null
  qualifiesForCustomerBrain: boolean
  vibeyUserId: string | null
}

export type SlackTrainingChannel = { id: string; name: string }

export type RecurringTrainingRule =
  | {
      id: string
      kind: 'slack'
      name: string
      enabled: boolean
      connected: boolean
      cadence: Extract<RecurringTrainingCadence, 'daily' | 'weekly' | 'monthly'>
      destinationLabel: string
      destinationKind: Exclude<RecurringTrainingTargetKind, 'workspace'>
      lastRunAt: string | null
      mapping: SlackTrainingMapping
    }
  | {
      id: 'fathom:auto'
      kind: 'fathom_auto'
      name: string
      enabled: boolean
      connected: boolean
      cadence: 'realtime'
      destinationLabel: string
      destinationKind: 'user'
      lastRunAt: null
      connectedAt: string | null
      autoIngest: boolean
      billingScope: 'personal' | 'org'
      billingOrgId: string | null
    }
  | {
      id: 'fireflies:sync'
      kind: 'fireflies_sync'
      name: string
      enabled: boolean
      connected: boolean
      cadence: 'manual'
      destinationLabel: string
      destinationKind: 'user'
      lastRunAt: null
      connectedAt: string | null
    }
  | {
      id: 'zoom:auto'
      kind: 'zoom_auto'
      name: string
      enabled: false
      connected: false
      cadence: 'unknown'
      destinationLabel: string
      destinationKind: 'user'
      lastRunAt: null
    }
  | {
      id: 'company:dream'
      kind: 'company_dream'
      name: string
      enabled: boolean
      connected: boolean
      cadence: CompanyCortexSchedule
      destinationLabel: string
      destinationKind: 'workspace'
      lastRunAt: string | null
      settings: CompanyCortexSettings
    }

type BrainRow = {
  id: string
  label: string
  is_default: boolean
  agent_id: string | null
  campaign_id: string | null
}

type SlackMappingsResponse = {
  mappings: SlackTrainingMapping[]
  connected: boolean
  autoIngest: boolean
}

function isGeneralCampaignRow(c: { name: string | null; config: unknown }): boolean {
  const config = (c.config ?? {}) as Record<string, unknown>
  const systemKind = typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
  const normalizedName = (c.name ?? '').trim().toLowerCase()
  return normalizedName === 'general' || systemKind === 'general'
}

function targetKindLabel(kind: RecurringTrainingTargetKind): string {
  if (kind === 'customer') return 'Customer Brain'
  if (kind === 'workspace') return 'Workspace'
  return kind
}

export function recurringTrainingKindLabel(kind: RecurringTrainingKind): string {
  switch (kind) {
    case 'all':
      return 'All'
    case 'slack':
      return 'Slack'
    case 'fathom_auto':
      return 'Fathom'
    case 'fireflies_sync':
      return 'Fireflies'
    case 'zoom_auto':
      return 'Zoom'
    case 'company_dream':
      return 'Dreaming'
  }
}

export function recurringTrainingCadenceLabel(cadence: RecurringTrainingCadence): string {
  switch (cadence) {
    case 'realtime':
      return 'Realtime'
    case 'manual':
      return 'Manual'
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'weekdays':
      return 'Weekdays'
    case 'manual_only':
      return 'Manual only'
    case 'unknown':
      return 'Coming soon'
  }
}

export async function listBrainTrainingDestinations(): Promise<SlackTrainingDestination[]> {
  const supabase = createClient()
  const [brainsRes, agentsRes, campaignsRes] = await Promise.all([
    // eslint-disable-next-line no-restricted-syntax -- direct brain query for training-destination scope resolution
    supabase
      .from('ns_brains')
      .select('id, name, is_default, agent_id, campaign_id')
      .eq('status', 'active')
      .is('org_id', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line no-restricted-syntax -- direct agents_registry query for training-destination scope resolution
    supabase.from('agents_registry').select('agent_key, name').is('org_id', null),
    // eslint-disable-next-line no-restricted-syntax -- direct campaigns query for training-destination scope resolution
    supabase
      .from('campaigns')
      .select('id, name, config')
      .is('deleted_at', null)
      .neq('status', 'archived'),
  ])

  const agentNames = new Map(
    (agentsRes.data ?? []).map((a: { agent_key: string; name: string | null }) => [
      a.agent_key,
      a.name,
    ]),
  )
  const campaignRows = (campaignsRes.data ?? []) as {
    id: string
    name: string | null
    config: unknown
  }[]
  const campaignNames = new Map(campaignRows.map((c) => [c.id, c.name]))
  const generalCampaignIds = new Set(campaignRows.filter(isGeneralCampaignRow).map((c) => c.id))

  const rows: BrainRow[] = []
  for (const b of brainsRes.data ?? []) {
    if (b.agent_id && !agentNames.has(b.agent_id)) continue
    if (b.campaign_id && !campaignNames.has(b.campaign_id)) continue
    if (b.campaign_id && generalCampaignIds.has(b.campaign_id)) continue

    let label = 'Your Brain'
    if (b.is_default) label = 'Your Brain'
    else if (b.agent_id) label = agentNames.get(b.agent_id) ?? b.agent_id
    else if (b.campaign_id) label = campaignNames.get(b.campaign_id) ?? 'Campaign'

    rows.push({
      id: b.id,
      label,
      is_default: b.is_default,
      agent_id: b.agent_id,
      campaign_id: b.campaign_id,
    })
  }

  return rows.map((brain) => ({
    id: brain.id,
    label: brain.label,
    targetKind: brain.campaign_id ? 'campaign' : brain.agent_id ? 'agent' : 'user',
    targetBrainId: brain.campaign_id ? null : brain.id,
    targetCampaignId: brain.campaign_id,
  }))
}

export async function listRecurringTrainingRules(): Promise<{
  rules: RecurringTrainingRule[]
  destinations: SlackTrainingDestination[]
  slackConnected: boolean
  slackAutoIngest: boolean
  slackTeamName: string | null
}> {
  const activeOrgId = getActiveOrgIdFromStorage()
  const [destinations, slackRes, slackStatus, fathomRes, firefliesRes, companyRes] =
    await Promise.all([
      listBrainTrainingDestinations().catch(() => []),
      backendGet<SlackMappingsResponse>('/api/integrations/slack/brain-mappings').catch(() => null),
      backendGet<{ connected: boolean; teamName?: string | null }>('/api/slack/status').catch(
        () => null,
      ),
      backendGet<{
        success: boolean
        connected: boolean
        status: string | null
        connectedAt: string | null
        autoIngest?: boolean
        billingScope?: 'personal' | 'org'
        billingOrgId?: string | null
      }>('/api/integrations/fathom/status').catch(() => null),
      backendGet<{
        success: boolean
        connected: boolean
        status: string | null
        connectedAt: string | null
      }>('/api/integrations/fireflies/status').catch(() => null),
      activeOrgId ? fetchCompanyCortexStatus().catch(() => null) : Promise.resolve(null),
    ])

  const destinationByBrainId = new Map(
    destinations.flatMap((destination) =>
      destination.targetBrainId ? [[destination.targetBrainId, destination] as const] : [],
    ),
  )
  const destinationByCampaignId = new Map(
    destinations.flatMap((destination) =>
      destination.targetCampaignId ? [[destination.targetCampaignId, destination] as const] : [],
    ),
  )

  const rules: RecurringTrainingRule[] = []
  for (const mapping of slackRes?.mappings ?? []) {
    const destination =
      mapping.target_kind === 'campaign' && mapping.target_campaign_id
        ? destinationByCampaignId.get(mapping.target_campaign_id)
        : mapping.target_brain_id
          ? destinationByBrainId.get(mapping.target_brain_id)
          : null
    const destinationLabel =
      mapping.target_kind === 'customer'
        ? 'Customer Brain'
        : (destination?.label ?? targetKindLabel(mapping.target_kind))

    rules.push({
      id: `slack:${mapping.id}`,
      kind: 'slack',
      name: `#${mapping.slack_channel_name}`,
      enabled: mapping.enabled && (slackRes?.autoIngest ?? true),
      connected: !!slackRes?.connected || !!slackStatus?.connected,
      cadence: mapping.cadence,
      destinationLabel,
      destinationKind: mapping.target_kind,
      lastRunAt: mapping.last_synced_at,
      mapping,
    })
  }

  rules.push({
    id: 'fathom:auto',
    kind: 'fathom_auto',
    name: 'Fathom auto-crystallize',
    enabled: !!fathomRes?.connected && (fathomRes.autoIngest ?? true),
    connected: !!fathomRes?.connected,
    cadence: 'realtime',
    destinationLabel: 'Personal Brain',
    destinationKind: 'user',
    lastRunAt: null,
    connectedAt: fathomRes?.connectedAt ?? null,
    autoIngest: fathomRes?.autoIngest ?? true,
    billingScope: fathomRes?.billingScope === 'org' ? 'org' : 'personal',
    billingOrgId:
      fathomRes?.billingScope === 'org' && typeof fathomRes.billingOrgId === 'string'
        ? fathomRes.billingOrgId
        : null,
  })

  rules.push({
    id: 'fireflies:sync',
    kind: 'fireflies_sync',
    name: 'Fireflies sync',
    enabled: !!firefliesRes?.connected,
    connected: !!firefliesRes?.connected,
    cadence: 'manual',
    destinationLabel: 'Personal Brain',
    destinationKind: 'user',
    lastRunAt: null,
    connectedAt: firefliesRes?.connectedAt ?? null,
  })

  rules.push({
    id: 'zoom:auto',
    kind: 'zoom_auto',
    name: 'Zoom recurring training',
    enabled: false,
    connected: false,
    cadence: 'unknown',
    destinationLabel: 'Personal Brain',
    destinationKind: 'user',
    lastRunAt: null,
  })

  if (companyRes?.settings) {
    rules.push({
      id: 'company:dream',
      kind: 'company_dream',
      name: 'Company daily dream',
      enabled: companyRes.settings.enabled,
      connected: true,
      cadence: companyRes.settings.schedule,
      destinationLabel: 'Workspace',
      destinationKind: 'workspace',
      lastRunAt: companyRes.settings.last_successful_dream_at,
      settings: companyRes.settings,
    })
  }

  return {
    rules,
    destinations,
    slackConnected: !!slackRes?.connected || !!slackStatus?.connected,
    slackAutoIngest: slackRes?.autoIngest ?? true,
    slackTeamName: slackStatus?.teamName ?? null,
  }
}

export async function setFathomAutoIngest(
  autoIngest: boolean,
  billing?: { billingScope: 'personal' | 'org'; billingOrgId: string | null },
): Promise<{
  autoIngest: boolean
  billingScope: 'personal' | 'org'
  billingOrgId: string | null
}> {
  const res = await backendPost<{
    success: boolean
    autoIngest: boolean
    billingScope: 'personal' | 'org'
    billingOrgId: string | null
  }>('/api/integrations/fathom/settings/auto-ingest', { autoIngest, ...(billing ?? {}) })
  return {
    autoIngest: res.autoIngest,
    billingScope: res.billingScope,
    billingOrgId: res.billingOrgId,
  }
}

export async function syncFireflies(): Promise<{ synced: number; skipped: number }> {
  const res = await backendPost<{ success: boolean; synced: number; skipped: number }>(
    '/api/integrations/fireflies/sync',
    {},
  )
  return { synced: res.synced ?? 0, skipped: res.skipped ?? 0 }
}

export async function setSlackAutoIngest(autoIngest: boolean): Promise<boolean> {
  const res = await backendPost<{ autoIngest: boolean }>(
    '/api/integrations/slack/settings/auto-ingest',
    { autoIngest },
  )
  return res.autoIngest
}

export async function syncSlackMapping(mappingId: string): Promise<void> {
  await backendPost(`/api/integrations/slack/brain-mappings/${mappingId}/sync-now`, {})
}

export async function deleteSlackMapping(mappingId: string): Promise<void> {
  await backendDelete(`/api/integrations/slack/brain-mappings/${mappingId}`)
}

export async function listSlackTrainingChannels(): Promise<SlackTrainingChannel[]> {
  const res = await backendGet<{ channels: SlackTrainingChannel[] }>(
    '/api/integrations/slack/channels',
  )
  return res.channels ?? []
}

export async function listSlackTrainingSenders(): Promise<SlackTrainingSender[]> {
  const res = await backendGet<{ senders: SlackTrainingSender[] }>(
    '/api/integrations/slack/brain-mappings/sender-resolution',
  )
  return res.senders ?? []
}

export async function saveSlackTrainingMapping(input: {
  slack_channel_id: string
  slack_channel_name: string
  target_kind: Exclude<RecurringTrainingTargetKind, 'workspace'>
  target_brain_id: string | null
  target_campaign_id: string | null
  cadence: Extract<RecurringTrainingCadence, 'daily' | 'weekly' | 'monthly'>
}): Promise<void> {
  await backendPost('/api/integrations/slack/brain-mappings', input)
}

export { updateCompanyCortexSettings, type CompanyCortexSchedule, type CompanyCortexSettings }
