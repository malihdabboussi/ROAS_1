import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export default function CampaignsLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading Campaigns..." state="processing" size="lg" />
    </div>
  )
}
