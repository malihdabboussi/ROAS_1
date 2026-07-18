import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const CAP = 100

@Injectable()
export class EntityArtifactSearchRepository {
  async searchArtifacts(
    supabase: SupabaseClient,
    pattern: string,
    userId: string,
    orgId?: string | null,
  ) {
    const [
      offers,
      funnelsClassic,
      funnelsWebsite,
      sequences,
      sequenceEmails,
      presentations,
      avatars,
      ads,
      adCampaigns,
      adSets,
      socialPosts,
      blogPosts,
      pages,
    ] = await Promise.all([
      this.safeQuery(
        this.applyAccountFilter(
          supabase.from('offers').select('id, name, campaign_id').ilike('name', pattern).limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('funnels')
            .select('id, name, campaign_id, funnel_type')
            .ilike('name', pattern)
            .neq('funnel_type', 'website')
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('funnels')
            .select('id, name, campaign_id, funnel_type')
            .ilike('name', pattern)
            .eq('funnel_type', 'website')
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('sequences')
            .select('id, name, campaign_id')
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('sequence_emails')
            .select(
              `
            id,
            subject,
            sequence_id,
            sequences!inner (
              id,
              campaign_id,
              org_id
            )
          `,
            )
            .ilike('subject', pattern)
            .limit(CAP),
          userId,
          orgId,
          'sequences.org_id',
          null,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('presentations')
            .select('id, name, campaign_id')
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('avatars')
            .select('id, name, campaign_id')
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.mergeAds(supabase, pattern, orgId),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('ad_campaigns')
            .select('id, name, campaign_id')
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('ad_sets')
            .select(
              `
            id,
            name,
            ad_campaign_id,
            ad_campaigns!inner (
              campaign_id,
              org_id
            )
          `,
            )
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
          'ad_campaigns.org_id',
          null,
        ),
      ),
      this.mergeSocialPosts(supabase, pattern, userId, orgId),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('blog_posts')
            .select('id, title, campaign_id, funnel_id')
            .ilike('title', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('funnel_pages')
            .select(
              `
            id,
            name,
            funnel_id,
            funnels!inner (
              id,
              campaign_id,
              org_id
            )
          `,
            )
            .ilike('name', pattern)
            .limit(CAP),
          userId,
          orgId,
          'funnels.org_id',
          null,
        ),
      ),
    ])

    return {
      offers,
      funnelsClassic,
      funnelsWebsite,
      sequences,
      sequenceEmails,
      presentations,
      avatars,
      ads,
      adCampaigns,
      adSets,
      socialPosts,
      blogPosts,
      pages,
    }
  }

  private applyAccountFilter<
    Q extends {
      eq: (column: string, value: string) => Q
      is: (column: string, value: null) => Q
      or: (filters: string) => Q
    },
  >(
    query: Q,
    userId: string,
    orgId: string | null | undefined,
    orgColumn = 'org_id',
    userColumn: string | null = 'user_id',
  ): Q {
    if (!userColumn) {
      if (orgId === undefined) return query
      return (orgId ? query.eq(orgColumn, orgId) : query.is(orgColumn, null)) as Q
    }
    if (!orgId) return query.is(orgColumn, null).eq(userColumn, userId) as Q
    return query.or(
      `${orgColumn}.eq.${orgId},and(${orgColumn}.is.null,${userColumn}.eq.${userId})`,
    ) as Q
  }

  private async mergeAds(
    supabase: SupabaseClient,
    pattern: string,
    orgId?: string | null,
  ): Promise<
    {
      id: string
      headline: string | null
      primary_text: string | null
      campaign_id: string | null
    }[]
  > {
    type AdRow = {
      id: string
      headline: string | null
      primary_text: string | null
      campaign_id: string | null
    }
    const buildAdsQuery = (col: 'headline' | 'primary_text') => {
      const base = supabase
        .from('ads')
        .select('id, headline, primary_text, campaign_id')
        .ilike(col, pattern)
        .limit(CAP)
      if (orgId === undefined) return base
      if (orgId) {
        return supabase
          .from('ads')
          .select(
            `
            id,
            headline,
            primary_text,
            campaign_id,
            campaigns!inner (
              org_id
            )
          `,
          )
          .ilike(col, pattern)
          .eq('campaigns.org_id', orgId)
          .limit(CAP)
      }
      return supabase
        .from('ads')
        .select(
          `
          id,
          headline,
          primary_text,
          campaign_id,
          campaigns!left (
            org_id
          )
        `,
        )
        .ilike(col, pattern)
        .or('campaign_id.is.null,campaigns.org_id.is.null')
        .limit(CAP)
    }
    const [byHeadline, byBody] = await Promise.all([
      this.safeQuery(buildAdsQuery('headline')),
      this.safeQuery(buildAdsQuery('primary_text')),
    ])
    const map = new Map<string, AdRow>()
    for (const row of [...byHeadline, ...byBody] as AdRow[]) {
      map.set(row.id, row)
    }
    return Array.from(map.values()).slice(0, CAP)
  }

  private async mergeSocialPosts(
    supabase: SupabaseClient,
    pattern: string,
    userId: string,
    orgId?: string | null,
  ): Promise<
    { id: string; caption: string | null; headline: string | null; campaign_id: string | null }[]
  > {
    type SpRow = {
      id: string
      caption: string | null
      headline: string | null
      campaign_id: string | null
    }
    const [byCap, byHead] = await Promise.all([
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('social_posts')
            .select('id, caption, headline, campaign_id')
            .ilike('caption', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
      this.safeQuery(
        this.applyAccountFilter(
          supabase
            .from('social_posts')
            .select('id, caption, headline, campaign_id')
            .ilike('headline', pattern)
            .limit(CAP),
          userId,
          orgId,
        ),
      ),
    ])
    const map = new Map<string, SpRow>()
    for (const row of [...byCap, ...byHead] as SpRow[]) {
      map.set(row.id, row)
    }
    return Array.from(map.values()).slice(0, CAP)
  }

  private async safeQuery(
    promise: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await Promise.resolve(promise)
    if (error) return []
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  }
}
