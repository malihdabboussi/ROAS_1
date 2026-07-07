import type { ReactNode } from 'react'
import { fetchAd, fetchAdCampaign, fetchAdSet } from '../../services/artifact-preview.service'
import type { MessageContentBlock } from '../../types'
import {
  MetaAdAccountSelector,
  MetaConfigCard,
  MetaPublishConfirm,
  MetaStatusCard,
} from '../chat/meta'
import type { ContentBlockRenderContext } from './message-bubble.types'

type MetaAdAccountOption = { id: string; name: string; currency?: string }
type MetaPageOption = { id: string; name: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return undefined
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function readRecord(
  record: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key]
    if (isRecord(value)) return value
  }
  return undefined
}

function normalizeMetaAdAccounts(raw: unknown): MetaAdAccountOption[] {
  if (!Array.isArray(raw)) return []
  const accounts: MetaAdAccountOption[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = readString(entry, 'id', 'account_id', 'ad_account_id')
    const name = readString(entry, 'name', 'account_name')
    if (!id || !name) continue
    accounts.push({
      id,
      name,
      ...(typeof entry.currency === 'string' ? { currency: entry.currency } : {}),
    })
  }
  return accounts
}

function normalizeMetaPages(raw: unknown): MetaPageOption[] {
  if (!Array.isArray(raw)) return []
  const pages: MetaPageOption[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = readString(entry, 'id', 'page_id')
    const name = readString(entry, 'name', 'page_name')
    if (!id || !name) continue
    pages.push({ id, name })
  }
  return pages
}

function normalizeMetaDefaults(raw: unknown) {
  if (!isRecord(raw)) return undefined
  const countriesRaw = raw.countries
  return {
    objective: readString(raw, 'objective'),
    daily_budget: readNumber(raw, 'daily_budget', 'dailyBudget'),
    countries: Array.isArray(countriesRaw)
      ? countriesRaw.filter((country): country is string => typeof country === 'string')
      : undefined,
    pixel_id: readString(raw, 'pixel_id', 'pixelId'),
    custom_event_type: readString(raw, 'custom_event_type', 'customEventType'),
  }
}

export function messageContentBlockMeta(
  block: MessageContentBlock,
  ctx: ContentBlockRenderContext,
): ReactNode | undefined {
  const { message, appendUiBlockToOrderedBlocks } = ctx

  if (block.type === 'meta_ad_accounts') {
    const rawBlock = block as unknown as Record<string, unknown>
    const data = readRecord(rawBlock, 'data', 'result')
    const adAccounts = normalizeMetaAdAccounts(
      rawBlock.adAccounts ??
        rawBlock.ad_accounts ??
        rawBlock.accounts ??
        data?.adAccounts ??
        data?.data,
    )
    const pages = normalizeMetaPages(
      rawBlock.pages ?? rawBlock.facebook_pages ?? data?.pages ?? data?.data,
    )
    return (
      <MetaAdAccountSelector
        key={block.id}
        adAccounts={adAccounts}
        pages={pages}
        onSelect={async (adAccountId, pageId) => {
          const blockDefaults = normalizeMetaDefaults(rawBlock.defaults)
          let resolvedCampaignId = readString(rawBlock, 'campaignId', 'campaign_id')
          let objective = blockDefaults?.objective
          let dailyBudget = blockDefaults?.daily_budget
          let countries = blockDefaults?.countries
          let pixelId = blockDefaults?.pixel_id
          let customEventType = blockDefaults?.custom_event_type
          const adId = readString(rawBlock, 'adId', 'ad_id')

          try {
            if (!resolvedCampaignId && adId) {
              const ad = await fetchAd(adId)
              if (ad.ad_set_id) {
                const adSet = await fetchAdSet(ad.ad_set_id)
                resolvedCampaignId = adSet.ad_campaign_id
                if (!countries) {
                  const geo = (adSet.targeting?.geo_locations as { countries?: string[] }) ?? {}
                  countries = geo.countries ?? countries
                }
              }
            }
            if (resolvedCampaignId) {
              const campaign = await fetchAdCampaign(resolvedCampaignId)
              const metadata = (campaign.metadata as Record<string, unknown>) ?? {}
              objective = objective ?? campaign.objective
              dailyBudget = dailyBudget ?? campaign.daily_budget ?? undefined
              pixelId =
                pixelId ??
                (typeof metadata.meta_pixel_id === 'string' ? metadata.meta_pixel_id : undefined)
              customEventType =
                customEventType ??
                (typeof metadata.meta_custom_event_type === 'string'
                  ? metadata.meta_custom_event_type
                  : undefined)
            }
          } catch {
            // Keep existing fallback defaults when campaign lookup fails.
          }

          const defaults = {
            objective: objective ?? 'OUTCOME_TRAFFIC',
            daily_budget: dailyBudget ?? 500,
            countries: countries ?? ['US'],
            pixel_id: pixelId,
            custom_event_type: customEventType,
          }
          const nextBlock: MessageContentBlock = {
            type: 'meta_config',
            id: `meta-config-${Date.now()}`,
            adId: adId ?? '',
            campaignId: resolvedCampaignId,
            adAccountId,
            pageId,
            campaignName: readString(rawBlock, 'campaignName', 'campaign_name'),
            headline: readString(rawBlock, 'headline'),
            primaryText: readString(rawBlock, 'primaryText', 'primary_text'),
            imageUrl: readString(rawBlock, 'imageUrl', 'image_url'),
            defaults,
          }
          appendUiBlockToOrderedBlocks(message.conversation_id, message.id, nextBlock)
        }}
      />
    )
  }

  if (block.type === 'meta_config') {
    const rawBlock = block as unknown as Record<string, unknown>
    const defaults = normalizeMetaDefaults(rawBlock.defaults)
    const adId = readString(rawBlock, 'adId', 'ad_id') ?? ''
    return (
      <MetaConfigCard
        key={block.id}
        adId={adId}
        defaults={defaults}
        onConfigure={(config) => {
          const nextBlock: MessageContentBlock = {
            type: 'meta_publish_confirm',
            id: `meta-publish-confirm-${Date.now()}`,
            adId,
            campaignId: readString(rawBlock, 'campaignId', 'campaign_id'),
            adAccountId: readString(rawBlock, 'adAccountId', 'ad_account_id') ?? '',
            pageId: readString(rawBlock, 'pageId', 'page_id') ?? '',
            pixelId: config.pixelId,
            customEventType: config.customEventType,
            campaignName: readString(rawBlock, 'campaignName', 'campaign_name') ?? 'Vibey Campaign',
            objective: config.objective,
            dailyBudget: config.dailyBudget,
            targeting: {
              geo_locations: {
                countries: config.countries,
              },
            },
            headline: readString(rawBlock, 'headline') ?? 'Your ad headline',
            primaryText: readString(rawBlock, 'primaryText', 'primary_text') ?? 'Your ad copy',
            imageUrl: readString(rawBlock, 'imageUrl', 'image_url'),
          }
          appendUiBlockToOrderedBlocks(message.conversation_id, message.id, nextBlock)
        }}
      />
    )
  }

  if (block.type === 'meta_publish_confirm') {
    const rawBlock = block as unknown as Record<string, unknown>
    const targeting = readRecord(rawBlock, 'targeting') ?? {}
    return (
      <MetaPublishConfirm
        key={block.id}
        adId={readString(rawBlock, 'adId', 'ad_id') ?? ''}
        campaignId={readString(rawBlock, 'campaignId', 'campaign_id')}
        adAccountId={readString(rawBlock, 'adAccountId', 'ad_account_id') ?? ''}
        pageId={readString(rawBlock, 'pageId', 'page_id') ?? ''}
        pixelId={readString(rawBlock, 'pixelId', 'pixel_id')}
        customEventType={readString(rawBlock, 'customEventType', 'custom_event_type')}
        campaignName={readString(rawBlock, 'campaignName', 'campaign_name') ?? 'Vibey Campaign'}
        objective={readString(rawBlock, 'objective') ?? 'OUTCOME_TRAFFIC'}
        dailyBudget={readNumber(rawBlock, 'dailyBudget', 'daily_budget') ?? 500}
        targeting={targeting}
        headline={readString(rawBlock, 'headline') ?? 'Your ad headline'}
        primaryText={readString(rawBlock, 'primaryText', 'primary_text') ?? 'Your ad copy'}
        imageUrl={readString(rawBlock, 'imageUrl', 'image_url')}
        onPublished={({ metaAdId, campaignId }) => {
          const nextBlock: MessageContentBlock = {
            type: 'meta_status',
            id: `meta-status-${Date.now()}`,
            metaAdId,
            status: 'PAUSED',
            campaignId,
          }
          appendUiBlockToOrderedBlocks(message.conversation_id, message.id, nextBlock)
        }}
      />
    )
  }

  if (block.type === 'meta_status') {
    const rawBlock = block as unknown as Record<string, unknown>
    return (
      <MetaStatusCard
        key={block.id}
        metaAdId={readString(rawBlock, 'metaAdId', 'meta_ad_id', 'id') ?? ''}
        status={
          readString(rawBlock, 'status', 'effective_status', 'configured_status') ?? 'UNKNOWN'
        }
        campaignId={readString(rawBlock, 'campaignId', 'campaign_id', 'meta_campaign_id')}
      />
    )
  }

  return undefined
}
