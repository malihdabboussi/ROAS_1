import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StudioSearchRepository } from '../repositories/studio-search.repository'

export type StudioSearchArtifactKind =
  | 'offer'
  | 'funnel'
  | 'website'
  | 'sequence'
  | 'email'
  | 'presentation'
  | 'avatar'
  | 'ad'
  | 'ad_campaign'
  | 'ad_set'
  | 'social_post'
  | 'blog_post'
  | 'page'

export interface StudioSearchArtifactHit {
  kind: StudioSearchArtifactKind
  id: string
  campaign_id: string | null
  title: string
  sequence_id?: string
  funnel_id?: string
}

@Injectable()
export class StudioSearchService {
  constructor(private readonly repository: StudioSearchRepository) {}

  async search(
    supabase: SupabaseClient,
    rawQuery: string,
    orgId?: string | null,
  ): Promise<{ items: StudioSearchArtifactHit[] }> {
    const q = rawQuery.trim()
    if (q.length < 1) {
      return { items: [] }
    }

    const pattern = `%${q}%`

    const {
      offers: offersR,
      funnelsClassic: funnelsClassicR,
      funnelsWebsite: funnelsWebsiteR,
      sequences: sequencesR,
      sequenceEmails: seqEmailsR,
      presentations: presentationsR,
      avatars: avatarsR,
      ads: adsR,
      adCampaigns: adCampaignsR,
      adSets: adSetsR,
      socialPosts: socialPostsR,
      blogPosts: blogPostsR,
      pages: pagesR,
    } = await this.repository.searchArtifacts(supabase, pattern, orgId)

    const items: StudioSearchArtifactHit[] = []

    for (const row of offersR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'offer',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled offer',
      })
    }

    for (const row of funnelsClassicR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'funnel',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled funnel',
      })
    }

    for (const row of funnelsWebsiteR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'website',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled website',
      })
    }

    for (const row of sequencesR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'sequence',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled sequence',
      })
    }

    for (const row of seqEmailsR as {
      id: string
      subject: string | null
      sequence_id: string
      sequences:
        | { id: string; campaign_id: string | null }
        | { id: string; campaign_id: string | null }[]
    }[]) {
      const seq = Array.isArray(row.sequences) ? row.sequences[0] : row.sequences
      items.push({
        kind: 'email',
        id: row.id,
        campaign_id: seq?.campaign_id ?? null,
        title: row.subject ?? 'Email',
        sequence_id: row.sequence_id,
      })
    }

    for (const row of presentationsR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'presentation',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled presentation',
      })
    }

    for (const row of avatarsR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'avatar',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled avatar',
      })
    }

    for (const row of adsR as {
      id: string
      headline: string | null
      primary_text: string | null
      campaign_id: string | null
    }[]) {
      const title = row.headline?.trim() || row.primary_text?.slice(0, 80) || 'Untitled ad'
      items.push({
        kind: 'ad',
        id: row.id,
        campaign_id: row.campaign_id,
        title,
      })
    }

    for (const row of adCampaignsR as {
      id: string
      name: string | null
      campaign_id: string | null
    }[]) {
      items.push({
        kind: 'ad_campaign',
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.name ?? 'Untitled ad campaign',
      })
    }

    for (const row of adSetsR as {
      id: string
      name: string | null
      ad_campaigns: { campaign_id: string | null } | { campaign_id: string | null }[]
    }[]) {
      const ac = Array.isArray(row.ad_campaigns) ? row.ad_campaigns[0] : row.ad_campaigns
      items.push({
        kind: 'ad_set',
        id: row.id,
        campaign_id: ac?.campaign_id ?? null,
        title: row.name ?? 'Untitled ad set',
      })
    }

    for (const row of socialPostsR as {
      id: string
      caption: string | null
      headline: string | null
      campaign_id: string | null
    }[]) {
      const title = row.caption?.trim()?.slice(0, 80) || row.headline?.trim() || 'Social post'
      items.push({
        kind: 'social_post',
        id: row.id,
        campaign_id: row.campaign_id,
        title,
      })
    }

    for (const row of blogPostsR as {
      id: string
      title: string | null
      campaign_id: string | null
      funnel_id: string | null
    }[]) {
      items.push({
        kind: 'blog_post',
        id: row.id,
        campaign_id: row.campaign_id,
        funnel_id: row.funnel_id ?? undefined,
        title: row.title ?? 'Blog post',
      })
    }

    for (const row of pagesR as {
      id: string
      name: string | null
      funnel_id: string
      funnels:
        | { id: string; campaign_id: string | null }
        | { id: string; campaign_id: string | null }[]
    }[]) {
      const f = Array.isArray(row.funnels) ? row.funnels[0] : row.funnels
      items.push({
        kind: 'page',
        id: row.id,
        campaign_id: f?.campaign_id ?? null,
        funnel_id: row.funnel_id,
        title: row.name ?? 'Page',
      })
    }

    return { items }
  }
}
