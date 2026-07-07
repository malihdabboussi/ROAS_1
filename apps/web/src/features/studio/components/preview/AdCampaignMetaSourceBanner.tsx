import { ExternalLink } from 'lucide-react'

interface AdCampaignMetaSourceBannerProps {
  appearance: 'studio' | 'spaces'
  metaCampaignId?: string | null
  metaAdAccountId?: string | null
}

export function AdCampaignMetaSourceBanner({
  appearance,
  metaCampaignId,
  metaAdAccountId,
}: AdCampaignMetaSourceBannerProps) {
  const isSpaces = appearance === 'spaces'
  const adAccount = metaAdAccountId?.replace('act_', '')

  return (
    <div
      className={
        isSpaces
          ? 'border-primary/20 bg-primary/10 mx-spacing-4 mt-spacing-4 rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center gap-2 border'
          : 'border-primary/20 bg-primary/10 mx-5 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2'
      }
    >
      <span
        aria-hidden="true"
        className="bg-primary/15 text-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded body-4 font-bold"
      >
        M
      </span>
      <span className="typo-caption text-muted-foreground flex-1">
        Synced from Meta{metaCampaignId ? ` · ID ${metaCampaignId}` : ''}
      </span>
      {metaCampaignId ? (
        <a
          href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${adAccount}&selected_campaign_ids=${metaCampaignId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="typo-caption text-primary flex items-center gap-0.5 transition-colors hover:text-primary/80"
        >
          View on Meta
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  )
}
