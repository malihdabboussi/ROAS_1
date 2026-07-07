import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export default function StudioLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Opening Studio..." state="processing" size="lg" />
    </div>
  )
}
