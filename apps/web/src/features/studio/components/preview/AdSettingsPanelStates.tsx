import { AlertCircle } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

interface AdSettingsPanelErrorStateProps {
  message: string
}

export function AdSettingsPanelLoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb size="sm" text="Loading settings..." />
    </div>
  )
}

export function AdSettingsPanelErrorState({ message }: AdSettingsPanelErrorStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
      <p className="body-3 text-muted-foreground">{message}</p>
    </div>
  )
}
