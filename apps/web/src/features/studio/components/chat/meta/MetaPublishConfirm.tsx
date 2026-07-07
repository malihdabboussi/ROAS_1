'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Rocket } from 'lucide-react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { backendPost, backendUpload } from '@/lib/api/backend-client'
import {
  createMetaPixel,
  fetchAd,
  fetchAdCampaign,
  fetchAdSet,
  fetchMetaInstagramAccountsForPage,
  publishCampaignToMeta,
  updateAd,
  updateAdCampaign,
} from '../../../services/artifact-preview.service'
import type { Ad } from '../../../types'
import { AdSandpackPreview, type AdSandpackPreviewHandle } from '../../preview/AdSandpackPreview'

interface MetaPublishConfirmProps {
  adId: string
  campaignId?: string
  adAccountId: string
  pageId: string
  pixelId?: string
  customEventType?: string
  campaignName: string
  objective: string
  dailyBudget: number
  targeting: Record<string, unknown>
  headline: string
  primaryText: string
  imageUrl?: string
  onPublished?: (payload: { metaAdId: string; campaignId?: string }) => void
}

export function MetaPublishConfirm({
  adId,
  campaignId,
  adAccountId,
  pageId,
  pixelId,
  customEventType,
  campaignName,
  objective,
  dailyBudget,
  targeting,
  headline,
  primaryText,
  imageUrl,
  onPublished,
}: MetaPublishConfirmProps) {
  const [publishing, setPublishing] = useState(false)
  const [creatingPixel, setCreatingPixel] = useState(false)
  const [resolvedPixelId, setResolvedPixelId] = useState(pixelId ?? '')
  const [resolvedCustomEventType, setResolvedCustomEventType] = useState(
    customEventType ?? 'PURCHASE',
  )
  const [adForExport, setAdForExport] = useState<Ad | null>(null)
  const [effectiveImageUrl, setEffectiveImageUrl] = useState(imageUrl)
  const [result, setResult] = useState<{
    success: boolean
    meta_ad_id?: string
    error?: string
  } | null>(null)
  const exportPreviewRef = useRef<AdSandpackPreviewHandle>(null)

  const budgetDisplay =
    dailyBudget >= 100 ? `$${(dailyBudget / 100).toFixed(0)}` : `$${dailyBudget}`
  const objectiveLabel = objective.replace('OUTCOME_', '').replace(/_/g, ' ')
  const countriesDisplay =
    (targeting?.geo_locations as { countries?: string[] })?.countries?.join(', ') || 'All'

  useEffect(() => {
    setEffectiveImageUrl(imageUrl)
  }, [imageUrl])

  useEffect(() => {
    let active = true
    if (effectiveImageUrl) return

    const loadAd = async () => {
      try {
        const ad = await fetchAd(adId)
        if (!active) return
        setAdForExport(ad)
        if (ad.image_url) setEffectiveImageUrl(ad.image_url)
      } catch {
        // Keep existing UX: publish button will show raw error if user tries to publish.
      }
    }

    void loadAd()
    return () => {
      active = false
    }
  }, [adId, effectiveImageUrl])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const latestAd = adForExport ?? (await fetchAd(adId))
      let resolvedImageUrl = effectiveImageUrl

      if (!resolvedImageUrl) {
        const ad = latestAd
        if (!ad.generated_tsx) {
          throw new Error(STUDIO_INLINE_ERRORS.META_PUBLISH_AD_NEEDS_IMAGE_TO_PUBLISH)
        }

        const blob = await exportPreviewRef.current?.exportPng()
        if (!blob) {
          throw new Error(STUDIO_INLINE_ERRORS.META_PUBLISH_EXPORT_PNG_FAILED)
        }

        const form = new FormData()
        form.append('file', new File([blob], `ad-${adId}.png`, { type: 'image/png' }))
        form.append('category', 'generated')
        form.append('name', ad.headline || 'Meta ad export')

        const upload = await backendUpload<{
          success: boolean
          url?: string
          asset?: { id?: string } | null
        }>('/api/media/upload', form)

        resolvedImageUrl = upload.url ?? undefined
        if (!resolvedImageUrl) {
          throw new Error(STUDIO_INLINE_ERRORS.META_PUBLISH_UPLOAD_PNG_FAILED)
        }

        await updateAd(adId, {
          image_url: resolvedImageUrl,
          image_asset_id: upload.asset?.id ?? null,
        })
        setEffectiveImageUrl(resolvedImageUrl)
      }

      const instagramAccounts = await fetchMetaInstagramAccountsForPage(pageId)
      const preferredInstagramUserId = (latestAd.metadata?.meta_instagram_user_id as string) || ''
      const selectedInstagramAccount =
        instagramAccounts.find((account) => account.id === preferredInstagramUserId) ??
        instagramAccounts[0]
      const instagramUserId = selectedInstagramAccount?.id ?? ''
      if (!instagramUserId) {
        throw new Error(STUDIO_INLINE_ERRORS.META_PUBLISH_NO_IG_SELECTED)
      }

      let linkedCampaignId: string | null = null
      if (latestAd.ad_set_id) {
        try {
          const adSet = await fetchAdSet(latestAd.ad_set_id)
          linkedCampaignId = adSet.ad_campaign_id
        } catch {
          linkedCampaignId = null
        }
      }

      const resolvedCampaignId = linkedCampaignId || campaignId || null
      let existingCampaign: Awaited<ReturnType<typeof fetchAdCampaign>> | null = null
      let existingMetadata: Record<string, unknown> = {}
      if (resolvedCampaignId) {
        try {
          existingCampaign = await fetchAdCampaign(resolvedCampaignId)
          existingMetadata = (existingCampaign.metadata as Record<string, unknown>) ?? {}
        } catch {
          existingCampaign = null
          existingMetadata = {}
        }
        await updateAdCampaign(resolvedCampaignId, {
          objective,
          daily_budget: dailyBudget,
          meta_ad_account_id: adAccountId,
          meta_page_id: pageId,
          metadata: {
            ...existingMetadata,
            meta_instagram_user_id: instagramUserId,
            meta_pixel_id: resolvedPixelId || null,
            meta_custom_event_type: resolvedPixelId ? resolvedCustomEventType : null,
          },
        })
      }

      const res = linkedCampaignId
        ? await publishCampaignToMeta({
            campaignId: linkedCampaignId,
            adAccountId,
            pageId,
            instagramUserId,
            campaignName: existingCampaign?.name ?? campaignName,
            campaignObjective: objective,
            budgetType: (existingCampaign?.budget_type as 'ABO' | 'CBO' | undefined) ?? undefined,
            scheduleType:
              (existingCampaign?.schedule_type as 'continuous' | 'one_time' | undefined) ??
              undefined,
            dailyBudget,
            lifetimeBudget: existingCampaign?.lifetime_budget ?? null,
            bidStrategy: existingCampaign?.bid_strategy ?? undefined,
            targeting,
            startTime: existingCampaign?.start_time ?? null,
            endTime: existingCampaign?.end_time ?? null,
            pixelId: resolvedPixelId || undefined,
            customEventType: resolvedPixelId ? resolvedCustomEventType : undefined,
          })
        : await backendPost<{
            success: boolean
            meta_campaign_id?: string
            meta_ad_id?: string
            error?: string
          }>('/api/integrations/meta/publish-ad', {
            ad_id: adId,
            ad_account_id: adAccountId,
            page_id: pageId,
            instagram_user_id: instagramUserId,
            campaign_name: campaignName,
            campaign_objective: objective,
            daily_budget: dailyBudget,
            targeting,
            ...(resolvedPixelId ? { pixel_id: resolvedPixelId } : {}),
            ...(resolvedCustomEventType ? { custom_event_type: resolvedCustomEventType } : {}),
          })

      if (
        (res as { success?: boolean } | null)?.success &&
        (res as { meta_ad_id?: string }).meta_ad_id
      ) {
        onPublished?.({
          metaAdId: (res as { meta_ad_id: string }).meta_ad_id,
          campaignId: (res as { meta_campaign_id?: string }).meta_campaign_id,
        })
      }
      setResult(
        (res as { success: boolean; meta_ad_id?: string; error?: string }) ?? {
          success: false,
          error: STUDIO_INLINE_ERRORS.META_PUBLISH_NO_RESPONSE,
        },
      )
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.PUBLISH_FAILED,
      })
    } finally {
      setPublishing(false)
    }
  }

  if (result?.success) {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <div className="gap-spacing-2 flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
            <Rocket className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h3 className="body-1 text-foreground font-medium">Ad Published to Meta</h3>
            <p className="body-3 text-muted-foreground">
              Your ad is live (paused) on Meta. Review and activate it in Meta Ads Manager.
            </p>
          </div>
        </div>
        <div className="badge-glass badge-glass-green mt-spacing-2 inline-block">
          <span className="typo-caption font-medium">Published (Paused)</span>
        </div>
      </div>
    )
  }

  if (result && !result.success) {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <div className="gap-spacing-2 flex items-center">
          <AlertCircle className="icon-sm text-destructive" />
          <h3 className="body-1 text-destructive font-medium">Publish Failed</h3>
        </div>
        <p className="body-3 text-muted-foreground mt-spacing-1">{result.error}</p>
        <button
          onClick={handlePublish}
          className="button-glass-accent mt-spacing-3 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <span className="relative z-10">Try Again</span>
        </button>
        {result.error?.includes('pixel_required') && (
          <button
            onClick={async () => {
              const name = window.prompt('Pixel name')
              if (!name?.trim()) return
              setCreatingPixel(true)
              try {
                const created = await createMetaPixel(adAccountId, { name: name.trim() })
                if (created.id) setResolvedPixelId(created.id)
                setResolvedCustomEventType('PURCHASE')
                setResult(null)
                await handlePublish()
              } finally {
                setCreatingPixel(false)
              }
            }}
            disabled={creatingPixel || publishing}
            className="button-glass-neutral mt-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
          >
            {creatingPixel ? 'Creating pixel...' : 'Create Pixel and Retry'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-2 flex items-center">
        <Rocket className="icon-sm text-primary" />
        <h3 className="body-1 text-foreground font-medium">Ready to Publish</h3>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-1">
        Review your ad before pushing it to Meta.
      </p>

      {/* Ad Preview Summary */}
      <div className="container-glass-nested mt-spacing-3 rounded-spacing-2 p-spacing-3">
        <div className="space-y-spacing-2">
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Headline</span>
            <span className="body-3 text-foreground font-medium">{headline}</span>
          </div>
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Objective</span>
            <span className="badge-glass badge-glass-blue typo-caption font-medium">
              {objectiveLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Daily Budget</span>
            <span className="body-3 text-foreground font-medium">{budgetDisplay}/day</span>
          </div>
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Countries</span>
            <span className="body-3 text-foreground font-medium">{countriesDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Status</span>
            <span className="badge-glass badge-glass-warning-bg typo-caption font-medium">
              Paused
            </span>
          </div>
        </div>
        {primaryText && (
          <div className="border-border mt-spacing-2 pt-spacing-2 border-t">
            <span className="typo-caption text-muted-foreground">Primary Text</span>
            <p className="body-3 text-foreground mt-1 line-clamp-2">{primaryText}</p>
          </div>
        )}
      </div>

      {effectiveImageUrl && (
        <div className="mt-spacing-2 rounded-spacing-2 overflow-hidden">
          <img
            src={effectiveImageUrl}
            alt="Ad preview"
            className="h-auto max-h-48 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="gap-spacing-2 mt-spacing-4 flex">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {publishing ? 'Publishing to Meta...' : 'Push to Meta'}
          </span>
        </button>
      </div>

      {!effectiveImageUrl && adForExport?.generated_tsx && (
        <div className="pointer-events-none absolute -left-[9999px] top-0 h-[600px] w-[420px] opacity-0">
          <AdSandpackPreview
            ref={exportPreviewRef}
            tsx={adForExport.generated_tsx}
            initialAspectRatio={adForExport.placement === 'story' ? '9:16' : '4:5'}
            showToolbar={false}
          />
        </div>
      )}
    </div>
  )
}
