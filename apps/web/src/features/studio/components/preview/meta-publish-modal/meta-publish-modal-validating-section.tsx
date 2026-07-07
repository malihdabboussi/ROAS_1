import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { META_PUBLISH_VALIDATION_MESSAGES } from '@/features/studio/config/studio-inline-errors.config'

export function MetaPublishModalValidatingSection({
  msgIndex,
  msgVisible,
}: {
  msgIndex: number
  msgVisible: boolean
}) {
  return (
    <div className="py-spacing-6 flex flex-col items-center">
      <VibeyLoadingOrb state="processing" size="md" cycleInterval={2200} />
      <div className="mt-spacing-4 h-6 overflow-hidden">
        <p
          className="body-2 text-muted-foreground text-center transition-all duration-300"
          style={{
            opacity: msgVisible ? 1 : 0,
            transform: msgVisible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {META_PUBLISH_VALIDATION_MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  )
}
