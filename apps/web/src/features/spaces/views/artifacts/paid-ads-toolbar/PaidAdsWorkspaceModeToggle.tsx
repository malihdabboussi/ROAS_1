import { PAID_ADS_WORKSPACE_LABELS } from '@/features/spaces/config/paid-ads-messages.config'
import type { PaidAdsWorkspaceMode } from '@/features/spaces/types/space-schema'

const OPTIONS: Array<{ id: PaidAdsWorkspaceMode; label: string }> = [
  { id: 'reporting', label: PAID_ADS_WORKSPACE_LABELS.ANALYZE },
  { id: 'research', label: 'Research' },
  { id: 'production', label: PAID_ADS_WORKSPACE_LABELS.PRODUCTION },
  { id: 'creating', label: PAID_ADS_WORKSPACE_LABELS.LAUNCH },
]

export function PaidAdsWorkspaceModeToggle({
  mode,
  onChange,
}: {
  mode: PaidAdsWorkspaceMode
  onChange: (mode: PaidAdsWorkspaceMode) => void
}) {
  return (
    <div
      className="border-border bg-secondary rounded-spacing-2 p-spacing-1 flex shrink-0 items-center border"
      aria-label="Paid Ads workspace mode"
    >
      {OPTIONS.map((option) => {
        const selected = option.id === mode
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            className={`body-4 rounded-spacing-1 px-spacing-2 py-spacing-1 font-medium transition-colors ${
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
