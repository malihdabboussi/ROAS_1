import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export function SpaceViewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <VibeyLoadingOrb text="Getting everything ready..." state="processing" size="lg" />
    </div>
  )
}

export function SpaceModalChunkLoading() {
  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center">
      <VibeyLoadingOrb state="processing" size="md" />
    </div>
  )
}
