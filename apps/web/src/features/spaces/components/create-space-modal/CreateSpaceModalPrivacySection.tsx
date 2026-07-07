import { Switch } from '@/components/ui/forms/switch'

interface CreateSpaceModalPrivacySectionProps {
  isPrivate: boolean
  onPrivateChange: (isPrivate: boolean) => void
}

export function CreateSpaceModalPrivacySection({
  isPrivate,
  onPrivateChange,
}: CreateSpaceModalPrivacySectionProps) {
  return (
    <div className="gap-spacing-3 flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="body-2 text-foreground font-medium">Make Private</p>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          Only you and invited members have access
        </p>
      </div>
      <Switch checked={isPrivate} onCheckedChange={onPrivateChange} />
    </div>
  )
}
