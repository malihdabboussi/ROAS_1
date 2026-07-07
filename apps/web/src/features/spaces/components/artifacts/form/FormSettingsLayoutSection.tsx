import type { FormSettings } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import { PanelSection } from './FormSettingsPanelPrimitives'

export function FormSettingsLayoutSection({
  settings,
  update,
}: {
  settings: FormSettings
  update: (patch: Partial<FormSettings>) => void
}) {
  return (
    <PanelSection title="Layout">
      <div className="gap-spacing-2 grid grid-cols-2">
        {(
          [
            ['one_column', 'One column'] as const,
            ['two_column', 'Two column'] as const,
          ] as const
        ).map(([value, label]) => {
          const active = (settings.layout ?? 'one_column') === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => update({ layout: value })}
              className={cn(
                'rounded-spacing-2 p-spacing-3 gap-spacing-3 flex w-full flex-col border text-left transition-colors',
                active
                  ? 'card-glass-blue text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-hover-subtle',
              )}
            >
              <FormLayoutOptionMockup variant={value} />
              <span className="body-3 block font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </PanelSection>
  )
}

/** Mini skeleton preview - same vocabulary as `FormEmptyMockup` in ArtifactViews. */
function FormLayoutOptionMockup({ variant }: { variant: 'one_column' | 'two_column' }) {
  const isOne = variant === 'one_column'
  return (
    <div aria-hidden className="h-spacing-20 flex flex-col">
      {isOne ? (
        <div className="gap-spacing-1 flex min-h-0 flex-1 flex-col justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-spacing-1">
              <div className="bg-secondary h-spacing-1 w-2/5 max-w-full rounded-full opacity-40" />
              <div className="bg-secondary h-spacing-3 rounded-spacing-1 border-border w-full border opacity-30" />
            </div>
          ))}
        </div>
      ) : (
        <div className="gap-spacing-1 grid min-h-0 flex-1 grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-spacing-1">
              <div className="bg-secondary h-spacing-1 w-4/5 max-w-full rounded-full opacity-40" />
              <div className="bg-secondary h-spacing-3 rounded-spacing-1 border-border w-full border opacity-30" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
