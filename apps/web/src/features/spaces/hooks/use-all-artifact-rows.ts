'use client'

import { useCallback, useMemo } from 'react'
import {
  fetchBlogPosts,
  fetchCampaignAdCampaigns,
  fetchCampaignAds,
  fetchCampaignAvatars,
  fetchCampaignEmails,
  fetchCampaignFormAggregates,
  fetchCampaignForms,
  fetchCampaignFunnels,
  fetchCampaignOffers,
  fetchCampaignPresentations,
  fetchCampaignSequences,
  fetchCampaignSocialPosts,
  fetchSpaceEmails,
  fetchSpaceFormAggregates,
  fetchSpaceForms,
} from '@/features/studio/services/artifact-preview.service'
import { fetchWorkflowGraph } from '@/features/studio/services/workflow.service'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { ArtifactListRow } from '../components/artifacts/artifact-display'
import {
  adRows,
  avatarRows,
  emailRows,
  formRows,
  funnelRows,
  offerRows,
  presentationRows,
  sequenceRows,
  socialPostRows,
  websiteRows,
} from '../components/artifacts/artifact-view-rows'
import {
  useArtifactRows,
  type ArtifactRealtimeTable,
} from '../components/artifacts/use-artifact-rows'
import {
  activeArtifactTypeFilters,
  artifactViewTypeToPreviewKind,
  getAllArtifactsConfig,
} from '../lib/all-artifacts'
import type { ArtifactViewType, ViewDef } from '../types/space-schema'

interface UseAllArtifactRowsParams {
  campaignId: string | null
  activeSpaceId: string | null
  activeView: ViewDef
  includeCampaignArtifacts: boolean
}

const ALL_ARTIFACTS_REALTIME_TABLES: ArtifactRealtimeTable[] = [
  'funnels',
  'offers',
  'ads',
  'sequences',
  'presentations',
  'avatars',
  'social_posts',
  'blog_posts',
  'forms',
  'form_responses',
  'emails',
]

const ALL_ARTIFACTS_CHILD_REALTIME_TABLES = ['funnel_pages', 'sequence_emails', 'ad_sets']

function stampAllArtifactRows(
  rows: ArtifactListRow[],
  viewType: ArtifactViewType,
): ArtifactListRow[] {
  return rows.map((row) => ({
    ...row,
    previewKind: artifactViewTypeToPreviewKind(viewType),
    artifactViewType: viewType,
    groupValues: {
      ...row.groupValues,
      artifact_type: viewType,
    },
  }))
}

export function useAllArtifactRows({
  campaignId,
  activeSpaceId,
  activeView,
  includeCampaignArtifacts,
}: UseAllArtifactRowsParams) {
  const kindsKey = activeArtifactTypeFilters(getAllArtifactsConfig(activeView)).join(',')
  const kinds = useMemo(() => kindsKey.split(',') as ArtifactViewType[], [kindsKey])
  const spaceFilter = includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined)
  const enabled = includeCampaignArtifacts || Boolean(activeSpaceId)

  const fetcher = useCallback(
    async (id: string): Promise<ArtifactListRow[]> => {
      const rows: ArtifactListRow[] = []
      const tasks: Promise<void>[] = []

      if (kinds.includes('funnels')) {
        tasks.push(
          // Same URL as the websites kind below — cachedFetch dedupe collapses
          // the two concurrent calls into one request.
          fetchCampaignFunnels(id, spaceFilter, { summary: true }).then((funnels) => {
            rows.push(...stampAllArtifactRows(funnelRows(funnels), 'funnels'))
          }),
        )
      }

      if (kinds.includes('websites')) {
        tasks.push(
          fetchCampaignFunnels(id, spaceFilter, { summary: true }).then(async (funnels) => {
            const websites = funnels.filter((f) => f.funnel_type === 'website')
            const blogPairs = await Promise.all(
              websites.map(
                async (website) =>
                  [website.id, await fetchBlogPosts(website.id).catch(() => [])] as const,
              ),
            )
            rows.push(
              ...stampAllArtifactRows(
                websiteRows(funnels, Object.fromEntries(blogPairs)),
                'websites',
              ),
            )
          }),
        )
      }

      if (kinds.includes('forms')) {
        tasks.push(
          (includeCampaignArtifacts
            ? fetchCampaignForms(id)
            : activeSpaceId
              ? fetchSpaceForms(id, activeSpaceId)
              : Promise.resolve([])
          ).then((forms) => {
            rows.push(...stampAllArtifactRows(formRows(forms), 'forms'))
          }),
        )
      }

      if (kinds.includes('offers')) {
        tasks.push(
          fetchCampaignOffers(id, spaceFilter).then((offers) => {
            rows.push(...stampAllArtifactRows(offerRows(offers), 'offers'))
          }),
        )
      }

      if (kinds.includes('avatars')) {
        tasks.push(
          fetchCampaignAvatars(id, spaceFilter).then((avatars) => {
            rows.push(...stampAllArtifactRows(avatarRows(avatars), 'avatars'))
          }),
        )
      }

      if (kinds.includes('sequences')) {
        tasks.push(
          fetchCampaignSequences(id, spaceFilter, { summary: true }).then((sequences) => {
            rows.push(...stampAllArtifactRows(sequenceRows(sequences), 'sequences'))
          }),
        )
      }

      if (kinds.includes('emails')) {
        tasks.push(
          (includeCampaignArtifacts
            ? fetchCampaignEmails(id)
            : activeSpaceId
              ? fetchSpaceEmails(id, activeSpaceId)
              : Promise.resolve([])
          ).then((emails) => {
            rows.push(...stampAllArtifactRows(emailRows(emails), 'emails'))
          }),
        )
      }

      if (kinds.includes('presentations')) {
        tasks.push(
          fetchCampaignPresentations(id, spaceFilter, { summary: true }).then((presentations) => {
            rows.push(...stampAllArtifactRows(presentationRows(presentations), 'presentations'))
          }),
        )
      }

      if (kinds.includes('social_posts')) {
        tasks.push(
          fetchCampaignSocialPosts(id, spaceFilter).then((posts) => {
            rows.push(...stampAllArtifactRows(socialPostRows(posts), 'social_posts'))
          }),
        )
      }

      if (kinds.includes('ads')) {
        tasks.push(
          Promise.all([
            fetchCampaignAds(id, spaceFilter),
            // Summary: ad-set names only — nested ad TSX never read here.
            fetchCampaignAdCampaigns(id, spaceFilter, { summary: true }),
          ]).then(([ads, adCampaigns]) => {
            const adSetNameById = Object.fromEntries(
              adCampaigns.flatMap((campaign) =>
                (campaign.ad_sets ?? []).map((set) => [set.id, set.name] as const),
              ),
            )
            rows.push(...stampAllArtifactRows(adRows(ads, adSetNameById), 'ads'))
          }),
        )
      }

      await Promise.all(tasks)
      return rows
    },
    [activeSpaceId, includeCampaignArtifacts, kinds, spaceFilter],
  )

  return useArtifactRows({
    campaignId,
    viewType: 'all_artifacts',
    realtimeTables: ALL_ARTIFACTS_REALTIME_TABLES,
    childRealtimeTables: ALL_ARTIFACTS_CHILD_REALTIME_TABLES,
    fetcher,
    enabled,
  })
}

export async function loadAllArtifactSupportMaps(
  campaignId: string,
  activeSpaceId: string | null,
  includeCampaignArtifacts: boolean,
  rows: ArtifactListRow[],
) {
  const hasForms = rows.some((r) => r.artifactViewType === 'forms')
  const hasAvatars = rows.some((r) => r.artifactViewType === 'avatars')
  const hasPresentations = rows.some((r) => r.artifactViewType === 'presentations')
  const hasSequences = rows.some((r) => r.artifactViewType === 'sequences')

  const offerSpaceFilter = includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined)
  const [offers, formAggregates, workflowGraph] = await Promise.all([
    hasAvatars || hasPresentations
      ? cachedFetch(
          `offer-names:${campaignId}:${offerSpaceFilter ?? ''}`,
          () => fetchCampaignOffers(campaignId, offerSpaceFilter),
          { ttlMs: 60_000 },
        ).catch(() => [])
      : Promise.resolve([]),
    hasForms && activeSpaceId
      ? (includeCampaignArtifacts
          ? fetchCampaignFormAggregates(campaignId)
          : fetchSpaceFormAggregates(campaignId, activeSpaceId)
        ).catch(() => [])
      : Promise.resolve([]),
    hasSequences && includeCampaignArtifacts
      ? cachedFetch(`workflow-graph:${campaignId}`, () => fetchWorkflowGraph(campaignId), {
          ttlMs: 60_000,
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  const avatarOfferMap = new Map<string, string>()
  const presentationOfferMap = new Map<string, string>()
  for (const o of offers) {
    const name = o.name?.trim() ? o.name : 'Offer'
    avatarOfferMap.set(o.id, name)
    presentationOfferMap.set(o.id, name)
  }

  const formAggregatesMap = new Map<
    string,
    {
      responses_count: number
      last_response_at: string | null
      target_space_name: string | null
    }
  >()
  for (const aggregate of formAggregates) {
    formAggregatesMap.set(aggregate.form_id, {
      responses_count: aggregate.responses_count,
      last_response_at: aggregate.last_response_at,
      target_space_name: aggregate.target_space_name,
    })
  }

  const sequenceFunnelMap = new Map<string, string>()
  if (workflowGraph) {
    const funnelNodes = new Map(
      workflowGraph.nodes.filter((n) => n.type === 'funnel').map((n) => [n.id, n.label]),
    )
    for (const edge of workflowGraph.edges) {
      if (
        edge.edge_type === 'funnel_conversion_to_sequence' &&
        edge.status !== 'paused' &&
        edge.status !== 'invalid'
      ) {
        const name = funnelNodes.get(edge.from_id)
        if (name) sequenceFunnelMap.set(edge.to_id, name)
      }
    }
  }

  return { avatarOfferMap, presentationOfferMap, formAggregatesMap, sequenceFunnelMap }
}
