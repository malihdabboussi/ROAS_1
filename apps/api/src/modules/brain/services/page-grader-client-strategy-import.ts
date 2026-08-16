import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PageGraderPackage, PageGraderRecord } from './page-grader-brain-package-build'

const PORTAL_BRAIN_BLOCKED_KEYS = new Set([
  'brand_primary_color',
  'brand_secondary_color',
  'brand_accent_color',
])

export async function syncCanonicalStrategyEntities(
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    campaignId: string
    offers: PageGraderRecord[]
    avatars: PageGraderRecord[]
  },
) {
  const [
    { data: existingOffers, error: offersError },
    { data: existingAvatars, error: avatarsError },
  ] = await Promise.all([
    supabase
      .from('offers')
      .select('id, name, processing_status, step1_data')
      .eq('campaign_id', input.campaignId),
    supabase
      .from('avatars')
      .select('id, name, avatar_type, persona_data')
      .eq('campaign_id', input.campaignId),
  ])
  if (offersError) {
    throw new BadRequestException(`Could not load canonical offers: ${offersError.message}`)
  }
  if (avatarsError) {
    throw new BadRequestException(`Could not load canonical avatars: ${avatarsError.message}`)
  }

  const offersByExternalId = new Map(
    (existingOffers ?? [])
      .map((row) => [portalSourceId(row.step1_data, 'page_grader_offer_id'), row] as const)
      .filter(([id]) => Boolean(id)),
  )
  const avatarsByExternalId = new Map(
    (existingAvatars ?? [])
      .map((row) => [portalSourceId(row.persona_data, 'page_grader_avatar_id'), row] as const)
      .filter(([id]) => Boolean(id)),
  )
  let offersCreated = 0
  let offersUpdated = 0
  let avatarsCreated = 0
  let avatarsUpdated = 0

  for (const rawOffer of input.offers) {
    const externalId = stringValue(rawOffer.id)
    const name = stringValue(rawOffer.name)
    if (!externalId || !name) continue
    const existing = offersByExternalId.get(externalId)
    const portalSnapshot = mapPortalOffer(rawOffer)
    if (existing) {
      const step1 = asRecord(existing.step1_data)
      const { error } = await supabase
        .from('offers')
        .update({
          step1_data: {
            ...step1,
            portal_snapshot: portalSnapshot,
            source: portalSnapshot.source,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) {
        throw new BadRequestException(`Could not refresh canonical offer: ${error.message}`)
      }
      offersUpdated += 1
    } else {
      const { error } = await supabase.from('offers').insert({
        user_id: input.userId,
        org_id: input.orgId,
        campaign_id: input.campaignId,
        space_id: null,
        name,
        processing_status: portalStrategyStatus(rawOffer),
        step1_data: {
          portal_snapshot: portalSnapshot,
          source: portalSnapshot.source,
        },
      })
      if (error) throw new BadRequestException(`Could not import canonical offer: ${error.message}`)
      offersCreated += 1
    }
  }

  for (const rawAvatar of input.avatars) {
    const externalId = stringValue(rawAvatar.id)
    const name = stringValue(rawAvatar.name)
    if (!externalId || !name) continue
    const existing = avatarsByExternalId.get(externalId)
    const portalSnapshot = mapPortalAvatar(rawAvatar)
    if (existing) {
      const persona = asRecord(existing.persona_data)
      const { error } = await supabase
        .from('avatars')
        .update({
          persona_data: {
            ...persona,
            portal_snapshot: portalSnapshot,
            source: portalSnapshot.source,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) {
        throw new BadRequestException(`Could not refresh canonical avatar: ${error.message}`)
      }
      avatarsUpdated += 1
    } else {
      const { error } = await supabase.from('avatars').insert({
        user_id: input.userId,
        org_id: input.orgId,
        campaign_id: input.campaignId,
        space_id: null,
        offer_id: null,
        name,
        avatar_type: 'customer',
        persona_data: {
          portal_snapshot: portalSnapshot,
          source: portalSnapshot.source,
          strategy_status: portalStrategyStatus(rawAvatar),
        },
      })
      if (error) {
        throw new BadRequestException(`Could not import canonical avatar: ${error.message}`)
      }
      avatarsCreated += 1
    }
  }

  return { offersCreated, offersUpdated, avatarsCreated, avatarsUpdated }
}

export async function syncCampaignResourceRegistry(
  supabase: SupabaseClient,
  campaign: Record<string, unknown>,
  pkg: PageGraderPackage,
) {
  const existing = asRecord(campaign.resources)
  const incoming = buildPortalResourceRegistry(pkg)
  const existingRegistry = Array.isArray(existing.registry)
    ? existing.registry.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
    : []
  const registryByKey = new Map(
    existingRegistry.map((entry) => [
      `${stringValue(entry.type)}:${stringValue(entry.value)}`,
      entry,
    ]),
  )
  for (const entry of incoming.registry) {
    registryByKey.set(`${entry.type}:${entry.value}`, {
      ...registryByKey.get(`${entry.type}:${entry.value}`),
      ...entry,
    })
  }
  const resources = {
    ...existing,
    website: stringValue(existing.website) || incoming.website,
    drive_folder: stringValue(existing.drive_folder) || incoming.drive_folder,
    x: stringValue(existing.x) || incoming.x,
    linkedin: stringValue(existing.linkedin) || incoming.linkedin,
    youtube: stringValue(existing.youtube) || incoming.youtube,
    instagram: stringValue(existing.instagram) || incoming.instagram,
    facebook: stringValue(existing.facebook) || incoming.facebook,
    registry: [...registryByKey.values()],
  }
  const { error } = await supabase
    .from('campaigns')
    .update({ resources, updated_at: new Date().toISOString() })
    .eq('id', String(campaign.id))
  if (error) {
    throw new BadRequestException(`Could not sync client resource registry: ${error.message}`)
  }
}

export function mapPortalOffer(offer: PageGraderRecord) {
  return {
    name: stringValue(offer.name),
    description: offer.description ?? null,
    offer_type: offer.offer_type ?? null,
    offer_stage: offer.offer_stage ?? null,
    price: offer.price ?? null,
    transformation: offer.transformation ?? null,
    unique_qualification: offer.unique_qualification ?? null,
    why_they_buy: offer.why_they_buy ?? null,
    guarantee: offer.guarantee ?? null,
    bonuses: offer.bonuses ?? null,
    key_benefits: offer.key_benefits ?? null,
    status: offer.status ?? null,
    reviewed_at: offer.reviewed_at ?? null,
    is_locked: offer.is_locked === true,
    source: {
      system: 'page_grader',
      page_grader_offer_id: stringValue(offer.id),
      source_type: offer.source ?? null,
      source_updated_at: offer.updated_at ?? null,
    },
  }
}

export function mapPortalAvatar(avatar: PageGraderRecord) {
  return {
    name: stringValue(avatar.name),
    demographics: avatar.demographics ?? null,
    pain_points: avatar.pain_points ?? null,
    unique_pain_points: avatar.unique_pain_points ?? null,
    desires: avatar.desires ?? null,
    objections: avatar.objections ?? null,
    things_tried: avatar.things_tried ?? null,
    resonant_angles: avatar.resonant_angles ?? null,
    stories_they_say: avatar.stories_they_say ?? null,
    language_patterns: avatar.language_patterns ?? null,
    status: avatar.status ?? null,
    reviewed_at: avatar.reviewed_at ?? null,
    is_locked: avatar.is_locked === true,
    source: {
      system: 'page_grader',
      page_grader_avatar_id: stringValue(avatar.id),
      source_type: avatar.source ?? null,
      source_updated_at: avatar.updated_at ?? null,
    },
  }
}

export function buildPortalResourceRegistry(pkg: PageGraderPackage) {
  const client = asRecord(pkg.client)
  const pointers = asRecord(pkg.source_pointers)
  const clickup = asRecord(pointers.clickup_ids)
  const socialLinks = Array.isArray(pkg.social_links) ? pkg.social_links : []
  const firstSocialUrl = (platform: string) =>
    stringValue(
      socialLinks.find((row) => stringValue(row.platform).toLowerCase() === platform)?.url,
      client[`${platform}_url`],
    )
  const resources = {
    website: safeHttpUrl(client.website_url),
    drive_folder: safeHttpUrl(client.drive_link, asStringArray(pointers.drive_links)[0]),
    x: firstSocialUrl('x') || firstSocialUrl('twitter'),
    linkedin: firstSocialUrl('linkedin'),
    youtube: firstSocialUrl('youtube'),
    instagram: firstSocialUrl('instagram'),
    facebook: firstSocialUrl('facebook'),
  }
  const candidates = [
    ['website', resources.website],
    ['drive', resources.drive_folder],
    ['slack', safeHttpUrl(client.slack_channel_url)],
    ['clickup', safeHttpUrl(clickup.url, client.clickup_url)],
    ['x', resources.x],
    ['linkedin', resources.linkedin],
    ['youtube', resources.youtube],
    ['instagram', resources.instagram],
    ['facebook', resources.facebook],
  ] as const
  return {
    ...resources,
    registry: candidates
      .filter(([, value]) => Boolean(value))
      .map(([type, value]) => ({
        type,
        value,
        source: 'page_grader',
        verification_status: ['website', 'drive', 'slack', 'clickup'].includes(type)
          ? 'connected'
          : 'unverified',
        last_observed_at: stringValue(pkg.envelope?.exported_at) || new Date().toISOString(),
      })),
  }
}

export function sanitizePortalBrainValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePortalBrainValue)
  if (!value || typeof value !== 'object') return value

  const sanitized: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PORTAL_BRAIN_BLOCKED_KEYS.has(key)) continue
    if (
      /(^|_)(password|secret|access_token|refresh_token|api_key|private_key|credential|token)($|_)/i.test(
        key,
      )
    ) {
      continue
    }
    sanitized[key] = sanitizePortalBrainValue(child)
  }
  return sanitized
}

function portalSourceId(value: unknown, key: string): string {
  return stringValue(asRecord(asRecord(value).source)[key])
}

function portalStrategyStatus(record: PageGraderRecord) {
  const status = stringValue(record.status).toLowerCase()
  return record.is_locked === true ||
    Boolean(record.reviewed_at) ||
    ['approved', 'confirmed'].includes(status)
    ? 'complete'
    : 'draft'
}

function safeHttpUrl(...values: unknown[]) {
  for (const value of values) {
    const candidate = stringValue(value)
    if (!candidate) continue
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString()
    } catch {
      continue
    }
  }
  return ''
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

export function recordList(
  value: PageGraderRecord | PageGraderRecord[] | undefined,
): PageGraderRecord[] | undefined {
  if (Array.isArray(value)) return value
  return value ? [value] : undefined
}

export function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function jsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value ?? null, null, 2), '```'].join('\n')
}
