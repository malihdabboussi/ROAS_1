import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export default function BrainLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading Brain..." state="processing" size="lg" />
    </div>
  )
}
