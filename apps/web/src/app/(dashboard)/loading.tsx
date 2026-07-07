import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading..." state="processing" size="lg" />
    </div>
  )
}
