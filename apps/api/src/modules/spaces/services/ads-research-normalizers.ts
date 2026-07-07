import type {
  AdCreativeFormat,
  AdDetails,
  AdDetailsTargeting,
  AdDetailsVariation,
  AdSearchResultItem,
  AdsResearchPlatform,
} from '../types/ads-research.types'

type Rec = Record<string, unknown>

const TIKTOK_AGE_BRACKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const
const TIKTOK_GENDER_KEYS = ['female', 'male', 'unknown'] as const

export function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {}
}

export function asArr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function pickStr(obj: Rec, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim() !== '') return v
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return null
}

function pickNum(obj: Rec, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

function toIso(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const asNum = Number(value)
    if (Number.isFinite(asNum) && /^\d+$/.test(value.trim())) return toIso(asNum)
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

function daysBetween(firstIso: string | null, lastIso: string | null): number | null {
  if (!firstIso) return null
  const first = new Date(firstIso).getTime()
  const last = lastIso ? new Date(lastIso).getTime() : Date.now()
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return null
  return Math.max(1, Math.round((last - first) / 86_400_000))
}

export function normalizeAds(platform: AdsResearchPlatform, root: Rec): AdSearchResultItem[] {
  if (platform === 'meta') return normalizeMetaAds(root)
  if (platform === 'tiktok') return normalizeTiktokAds(root)
  return normalizeGoogleAds(root)
}

export function normalizeMetaAdDetails(adId: string, root: Rec): AdDetails {
  const advertiser = asRec(root.advertiser)
  const page = asRec(advertiser.page)
  const pageInfoWrap = asRec(advertiser.ad_library_page_info)
  const pageInfo = asRec(pageInfoWrap.page_info)
  const pageSpend = asRec(pageInfoWrap.page_spend)
  const eu = asRec(asRec(root.transparency_by_location).eu_transparency)

  const locations: Array<{ name: string; detail: string | null }> = []
  for (const raw of asArr(eu.location_audience)) {
    const loc = asRec(raw)
    const name = pickStr(loc, ['name'])
    if (!name) continue
    locations.push({ name, detail: loc.excluded === true ? 'Excluded' : 'Targeted' })
  }
  const reachByCountry = asArr(eu.age_country_gender_reach_breakdown)
    .map(asRec)
    .map((entry) => ({
      country: pickStr(entry, ['country']) ?? '',
      reach: asArr(entry.age_gender_breakdowns)
        .map(asRec)
        .reduce(
          (sum, row) =>
            sum +
            (pickNum(row, ['male']) ?? 0) +
            (pickNum(row, ['female']) ?? 0) +
            (pickNum(row, ['unknown']) ?? 0),
          0,
        ),
    }))
    .filter((entry) => entry.country !== '' && entry.reach > 0)
    .sort((a, b) => b.reach - a.reach)
  for (const { country, reach } of reachByCountry.slice(0, 8)) {
    locations.push({ name: country, detail: `${reach.toLocaleString('en-US')} reached` })
  }

  const ageAudience = asRec(eu.age_audience)
  const ageMin = pickNum(ageAudience, ['min'])
  const ageMax = pickNum(ageAudience, ['max'])
  const genderRaw = pickStr(eu, ['gender_audience'])
  const euReach = pickNum(eu, ['eu_total_reach'])
  const targeting: AdDetailsTargeting = {
    locations,
    age_ranges: ageMin != null && ageMax != null ? [`${ageMin}–${ageMax}`] : [],
    genders: genderRaw && genderRaw.toLowerCase() !== 'all' ? [genderRaw] : [],
    audience_size: euReach != null ? `${euReach.toLocaleString('en-US')} reached (EU)` : null,
    signals: eu.targets_eu === true ? ['Targets EU'] : [],
  }
  const payer =
    asArr(pageSpend.lifetime_by_disclaimer)
      .map(asRec)
      .map((row) => pickStr(row, ['disclaimer']))
      .find((d): d is string => Boolean(d)) ?? null

  return {
    platform: 'meta',
    ad_id: adId,
    advertiser_name: pickStr(pageInfo, ['page_name']) ?? pickStr(page, ['name']),
    advertiser_location: null,
    advertiser_about: pickStr(asRec(page.about), ['text']),
    page_likes: pickNum(pageInfo, ['likes']),
    ig_username: pickStr(pageInfo, ['ig_username']),
    ig_followers: pickNum(pageInfo, ['ig_followers']),
    page_category: pickStr(pageInfo, ['page_category']),
    payer,
    topic: null,
    first_shown: null,
    last_shown: null,
    total_impressions: null,
    targeting,
    variations: metaSnapshotVariations(asRec(root.snapshot)),
    analyzed_at: new Date().toISOString(),
  }
}

export function normalizeTiktokAdDetails(adId: string, root: Rec): AdDetails {
  const ad = asRec(root.ad)
  const advertiser = asRec(ad.advertiser)
  const targetingRoot = asRec(ad.targeting)
  const location = asRec(targetingRoot.location)
  const locations = asArr(location.impressions_by_region)
    .map(asRec)
    .map((row) => ({
      name: pickStr(row, ['region']) ?? '',
      detail: pickStr(row, ['impressions']),
    }))
    .filter((loc) => loc.name !== '')

  const ageRows = asArr(targetingRoot.age).map(asRec)
  const ageRanges = TIKTOK_AGE_BRACKETS.filter((bracket) =>
    ageRows.some((row) => row[bracket] === true),
  )
  const genderRows = asArr(targetingRoot.gender).map(asRec)
  const genders = TIKTOK_GENDER_KEYS.filter((g) => genderRows.some((row) => row[g] === true))
  const audienceListRaw = pickStr(targetingRoot, ['audience_list'])
  const targeting: AdDetailsTargeting = {
    locations,
    age_ranges: [...ageRanges],
    genders: genders.length === TIKTOK_GENDER_KEYS.length ? [] : [...genders],
    audience_size:
      pickStr(targetingRoot, ['target_audience_size']) ?? pickStr(ad, ['estimated_audience']),
    signals: audienceListRaw?.toLowerCase() === 'yes' ? ['Custom audience list'] : [],
  }
  const variation: AdDetailsVariation = {
    title: null,
    text: pickStr(ad, ['caption', 'text', 'title']),
    image_url:
      pickStr(ad, ['cover_image', 'cover_image_url']) ??
      pickStr(asArr(ad.image_urls)[0] ? { v: asArr(ad.image_urls)[0] } : {}, ['v']),
    video_url: pickStr(ad, ['video_link', 'video_url']),
    link: pickStr(ad, ['landing_page', 'landing_url', 'link']),
    cta: null,
  }

  return {
    platform: 'tiktok',
    ad_id: adId,
    advertiser_name: pickStr(advertiser, ['name']) ?? pickStr(ad, ['advertiser']),
    advertiser_location: pickStr(advertiser, ['registry_location']),
    payer: pickStr(advertiser, ['sponsor']) ?? pickStr(ad, ['sponsor']),
    topic: null,
    first_shown: toIso(ad.first_shown_datetime),
    last_shown: toIso(ad.last_shown_datetime),
    total_impressions: pickStr(location, ['total_impressions']),
    targeting,
    variations: variation.image_url || variation.video_url || variation.text ? [variation] : [],
    analyzed_at: new Date().toISOString(),
  }
}

export function normalizeGoogleAdDetails(adId: string, root: Rec): AdDetails {
  const info = asRec(root.ad_information)
  const audience = asRec(info.audience_selection)
  const locations = asArr(info.regions)
    .map(asRec)
    .map((region) => ({
      name: pickStr(region, ['region', 'region_code', 'country', 'country_code', 'name']) ?? '',
      detail: pickStr(region, ['impressions', 'impressions_text', 'impressions_range']),
    }))
    .filter((loc) => loc.name !== '')

  const signals: string[] = []
  for (const key of ['demographic', 'geographic', 'contextual', 'customer_list', 'topics'] as const) {
    const value = audience[key]
    if (typeof value === 'string' && value.trim() !== '') signals.push(`${key}: ${value}`)
    else if (value === true) signals.push(key.replace('_', ' '))
  }

  const variations = asArr(root.variations)
    .map(asRec)
    .filter((v) => v.is_unavailable !== true)
    .map((v) => {
      const firstImage = asArr(v.images)[0]
      return {
        title: pickStr(v, ['title']),
        text: pickStr(v, ['snippet', 'description', 'text']),
        image_url:
          (typeof v.image === 'string' ? v.image : pickStr(asRec(v.image), ['link', 'url'])) ??
          (typeof firstImage === 'string'
            ? firstImage
            : pickStr(asRec(firstImage), ['link', 'url'])) ??
          pickStr(v, ['thumbnail', 'image_link']),
        video_url: pickStr(v, ['video_link']),
        link: pickStr(v, ['link', 'displayed_link', 'domain']),
        cta: pickStr(v, ['call_to_action']),
      }
    })

  return {
    platform: 'google',
    ad_id: adId,
    advertiser_name:
      pickStr(asRec(info.advertiser), ['name']) ??
      pickStr(info, ['advertiser_name']) ??
      pickStr(asRec(root.advertiser), ['name']),
    advertiser_location: null,
    payer: null,
    topic: pickStr(info, ['topic']),
    first_shown: toIso(info.first_shown_datetime ?? info.first_shown_date ?? info.first_shown),
    last_shown: toIso(info.last_shown_datetime ?? info.last_shown_date ?? info.last_shown),
    total_impressions: pickStr(info, ['impressions', 'impressions_text']),
    targeting: { locations, age_ranges: [], genders: [], audience_size: null, signals },
    variations,
    analyzed_at: new Date().toISOString(),
  }
}

function metaSnapshotVariations(snapshot: Rec): AdDetailsVariation[] {
  const cards = asArr(snapshot.cards).map(asRec)
  if (cards.length > 0) {
    return cards.map((card) => ({
      title: pickStr(card, ['title']),
      text: pickStr(card, ['body', 'text', 'link_description']),
      image_url: pickStr(card, ['original_image_url', 'resized_image_url']),
      video_url: pickStr(card, ['video_hd_url', 'video_sd_url']),
      link: pickStr(card, ['link_url']),
      cta: pickStr(card, ['cta_text', 'cta_type']),
    }))
  }
  const images = asArr(snapshot.images).map(asRec)
  const videos = asArr(snapshot.videos).map(asRec)
  if (images.length === 0 && videos.length === 0) return []
  return [
    {
      title: pickStr(snapshot, ['title']),
      text: pickStr(asRec(snapshot.body), ['text']),
      image_url:
        pickStr(images[0] ?? {}, ['original_image_url', 'resized_image_url']) ??
        pickStr(videos[0] ?? {}, ['video_preview_image_url']),
      video_url: pickStr(videos[0] ?? {}, ['video_hd_url', 'video_sd_url']),
      link: pickStr(snapshot, ['link_url']),
      cta: pickStr(snapshot, ['cta_text', 'cta_type']),
    },
  ]
}

function normalizeMetaAds(root: Rec): AdSearchResultItem[] {
  const seenCollations = new Set<string>()
  return asArr(root.ads)
    .map((raw): AdSearchResultItem | null => {
      const ad = asRec(raw)
      const snapshot = asRec(ad.snapshot)
      const adId = pickStr(ad, ['ad_archive_id', 'id'])
      if (!adId) return null
      const collationKey = pickStr(ad, ['collation_id']) ?? adId
      if (seenCollations.has(collationKey)) return null
      seenCollations.add(collationKey)

      const images = asArr(snapshot.images).map(asRec)
      const videos = asArr(snapshot.videos).map(asRec)
      const firstImage = images[0] ?? {}
      const firstVideo = videos[0] ?? {}
      const body = asRec(snapshot.body)
      const displayFormat = (pickStr(snapshot, ['display_format']) ?? '').toLowerCase()
      const format: AdCreativeFormat =
        videos.length > 0 || displayFormat === 'video'
          ? 'video'
          : displayFormat === 'carousel' || images.length > 1
            ? 'carousel'
            : images.length > 0 || displayFormat === 'image'
              ? 'image'
              : 'unknown'
      const firstShown = toIso(ad.start_date)
      const lastShown = toIso(ad.end_date)
      const isActive =
        typeof ad.is_active === 'boolean' ? ad.is_active : lastShown === null ? null : false

      return {
        ad_id: adId,
        platform: 'meta',
        advertiser_name: pickStr(ad, ['page_name']) ?? pickStr(snapshot, ['page_name']),
        advertiser_id: pickStr(ad, ['page_id']) ?? pickStr(snapshot, ['page_id']),
        format,
        creative_text: pickStr(body, ['text']) ?? pickStr(snapshot, ['title', 'link_description']),
        image_url:
          pickStr(firstImage, ['original_image_url', 'resized_image_url']) ??
          pickStr(firstVideo, ['video_preview_image_url']),
        video_url: pickStr(firstVideo, ['video_hd_url', 'video_sd_url']),
        landing_url: pickStr(snapshot, ['link_url']),
        first_shown: firstShown,
        last_shown: lastShown,
        days_running: daysBetween(firstShown, isActive === false ? lastShown : null),
        reach_estimate: null,
        is_active: isActive,
        details_link: null,
        details_token: pickStr(ad, ['ad_details_token']) ?? pickStr(snapshot, ['ad_details_token']),
        variant_count: pickNum(ad, ['collation_count']),
      } satisfies AdSearchResultItem
    })
    .filter((x): x is AdSearchResultItem => x !== null)
}

function normalizeTiktokAds(root: Rec): AdSearchResultItem[] {
  return asArr(root.ads)
    .map((raw): AdSearchResultItem | null => {
      const ad = asRec(raw)
      const adId = pickStr(ad, ['id', 'ad_id'])
      if (!adId) return null
      const firstShown = toIso(ad.first_shown_datetime)
      const lastShown = toIso(ad.last_shown_datetime)
      const reachMin = pickNum(ad, ['estimated_audience_min'])
      const reachMax = pickNum(ad, ['estimated_audience_max'])
      const reach =
        pickStr(ad, ['estimated_audience']) ??
        (reachMin !== null && reachMax !== null ? `${reachMin}-${reachMax}` : null)

      return {
        ad_id: adId,
        platform: 'tiktok',
        advertiser_name: pickStr(ad, ['advertiser', 'advertiser_name']),
        advertiser_id: pickStr(ad, ['advertiser_id']),
        format: 'video',
        creative_text: pickStr(ad, ['caption', 'text', 'title']),
        image_url: pickStr(ad, ['cover_image', 'cover_image_url']),
        video_url: pickStr(ad, ['video_link', 'video_url']),
        landing_url: pickStr(ad, ['landing_page', 'landing_url']),
        first_shown: firstShown,
        last_shown: lastShown,
        days_running: daysBetween(firstShown, lastShown),
        reach_estimate: reach,
        is_active: null,
        details_link: pickStr(ad, ['link', 'details_link']),
      } satisfies AdSearchResultItem
    })
    .filter((x): x is AdSearchResultItem => x !== null)
}

function normalizeGoogleAds(root: Rec): AdSearchResultItem[] {
  return asArr(root.ad_creatives)
    .map((raw): AdSearchResultItem | null => {
      const ad = asRec(raw)
      const adId = pickStr(ad, ['id', 'creative_id'])
      if (!adId) return null
      const rawFormat = (pickStr(ad, ['format']) ?? '').toLowerCase()
      const format: AdCreativeFormat =
        rawFormat === 'video'
          ? 'video'
          : rawFormat === 'image'
            ? 'image'
            : rawFormat === 'text'
              ? 'text'
              : 'unknown'
      const firstShown = toIso(ad.first_shown)
      const lastShown = toIso(ad.last_shown)
      const image = asRec(ad.image)
      const advertiser = asRec(ad.advertiser)

      return {
        ad_id: adId,
        platform: 'google',
        advertiser_name: pickStr(advertiser, ['name']) ?? pickStr(ad, ['advertiser_name']),
        advertiser_id: pickStr(advertiser, ['id']) ?? pickStr(ad, ['advertiser_id']),
        format,
        creative_text: pickStr(ad, ['text', 'title']),
        image_url: pickStr(image, ['link', 'url']) ?? pickStr(ad, ['image_link', 'image_url']),
        video_url: null,
        landing_url: pickStr(ad, ['target_domain', 'domain']),
        first_shown: firstShown,
        last_shown: lastShown,
        days_running:
          pickNum(ad, ['total_days_shown', 'days_shown']) ?? daysBetween(firstShown, lastShown),
        reach_estimate: null,
        is_active: null,
        details_link: pickStr(ad, ['details_link']),
      } satisfies AdSearchResultItem
    })
    .filter((x): x is AdSearchResultItem => x !== null)
}
