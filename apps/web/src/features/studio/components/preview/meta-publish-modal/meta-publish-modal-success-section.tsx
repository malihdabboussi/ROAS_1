import { Rocket } from 'lucide-react'

export function MetaPublishModalSuccessSection({
  adCampaignId,
  onClose,
}: {
  adCampaignId?: string
  onClose: () => void
}) {
  return (
    <div className="mt-spacing-4 space-y-spacing-3">
      <div className="border-border border-t" />
      <div className="py-spacing-4 flex flex-col items-center">
        <div className="mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <Rocket className="h-6 w-6 text-green-400" />
        </div>
        <p className="body-1 text-foreground font-semibold">Ad Published</p>
        <p className="body-3 text-muted-foreground mt-spacing-1 text-center">
          {adCampaignId
            ? 'Campaign ad sets and ads were published to Meta (paused). Review and activate in Meta Ads Manager.'
            : 'Your ad is live on Meta (paused). Review and activate it in Meta Ads Manager.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 w-full font-medium"
      >
        Done
      </button>
    </div>
  )
}
