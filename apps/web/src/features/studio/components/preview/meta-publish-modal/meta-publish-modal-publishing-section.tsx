import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export function MetaPublishModalPublishingSection() {
  return (
    <div className="mt-spacing-4 py-spacing-4 flex flex-col items-center">
      <VibeyLoadingOrb state="processing" size="md" />
      <p className="body-2 text-muted-foreground mt-spacing-3">Publishing to Meta...</p>
    </div>
  )
}
