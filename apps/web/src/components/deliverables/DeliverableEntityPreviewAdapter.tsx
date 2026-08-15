'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FunnelFullPreview } from '@/components/deliverables/FunnelFullPreview'
import { StandaloneEmailDeliverablePreview } from '@/components/deliverables/StandaloneEmailDeliverablePreview'
import { FormPreviewPane } from '@/features/spaces/components/artifacts/form/FormPreviewPane'
import { AdCampaignSettingsPanel } from '@/features/studio/components/preview/AdCampaignSettingsPanel'
import { AdPreview } from '@/features/studio/components/preview/AdPreview'
import { AdSetSettingsPanel } from '@/features/studio/components/preview/AdSetSettingsPanel'
import { AvatarPreview } from '@/features/studio/components/preview/AvatarPreview'
import { BlogPostPreview } from '@/features/studio/components/preview/BlogPostPreview'
import { OfferPreview } from '@/features/studio/components/preview/OfferPreview'
import { PresentationPreview } from '@/features/studio/components/preview/PresentationPreview'
import { SequencePreview } from '@/features/studio/components/preview/SequencePreview'
import SocialPostPreview from '@/features/studio/components/preview/SocialPostPreview'
import { ThemePreview } from '@/features/themes'
import { getTheme, type Theme } from '@/lib/themes'

export { FunnelFullPreview } from '@/components/deliverables/FunnelFullPreview'

function ThemeDeliverablePreview({ themeId }: { themeId: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    let cancelled = false
    getTheme(themeId)
      .then((nextTheme) => {
        if (!cancelled) setTheme(nextTheme)
      })
      .catch(() => {
        if (!cancelled) setTheme(null)
      })
    return () => {
      cancelled = true
    }
  }, [themeId])

  if (!theme) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <ThemePreview
      colors={theme.colors}
      designSettings={theme.design_settings ?? undefined}
      fontHeading={theme.font_heading}
      fontBody={theme.font_body}
    />
  )
}

export function DeliverableEntityPreviewAdapter({
  deliverableType,
  entityId,
}: {
  deliverableType: string
  entityId: string
}) {
  switch (deliverableType) {
    case 'presentation':
      return (
        <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: '60vh' }}>
          <PresentationPreview presentationId={entityId} hideSandpackToolbar />
        </div>
      )
    case 'funnel':
    case 'website':
      return <FunnelFullPreview funnelId={entityId} />
    case 'social_post':
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <SocialPostPreview socialPostId={entityId} hideToolbar />
        </div>
      )
    case 'ad':
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <AdPreview adId={entityId} />
        </div>
      )
    case 'ad_set':
      return <AdSetSettingsPanel adSetId={entityId} />
    case 'ad_campaign':
      return <AdCampaignSettingsPanel adCampaignId={entityId} />
    case 'form':
      return <FormPreviewPane formId={entityId} />
    case 'offer':
      return <OfferPreview offerId={entityId} hideToolbar />
    case 'avatar':
      return <AvatarPreview avatarId={entityId} hideToolbar />
    case 'sequence':
      return <SequencePreview sequenceId={entityId} hideToolbar />
    case 'email':
      return <StandaloneEmailDeliverablePreview emailId={entityId} />
    case 'blog_post':
      return <BlogPostPreview blogPostId={entityId} />
    case 'theme':
      return <ThemeDeliverablePreview themeId={entityId} />
    default:
      return (
        <div className="body-2 text-muted-foreground py-spacing-6 text-center">
          Preview not available for this type
        </div>
      )
  }
}
