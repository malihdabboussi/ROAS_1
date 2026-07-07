'use client'

import { cn } from '@/lib/utils/cn'
import type { TypographyScale, TypographySettings } from '../../types'
import { DEFAULT_TYPOGRAPHY_SETTINGS } from '../../types'

interface TypographyTabProps {
  value: TypographySettings | undefined
  onChange: (value: TypographySettings) => void
}

const TypographyPreview = ({ scale }: { scale: TypographyScale }) => {
  const sizes: Record<TypographyScale, { heading: string; body: string }> = {
    small: { heading: '11px', body: '8px' },
    normal: { heading: '14px', body: '10px' },
    large: { heading: '17px', body: '12px' },
  }
  const { heading, body } = sizes[scale]

  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span className="text-foreground/80 font-semibold leading-none" style={{ fontSize: heading }}>
        Aa
      </span>
      <span className="text-foreground/50 leading-none" style={{ fontSize: body }}>
        Text
      </span>
    </div>
  )
}

const SCALE_OPTIONS = [
  { value: 'small' as const, label: 'Small', description: 'Compact text, higher density' },
  { value: 'normal' as const, label: 'Normal', description: 'Balanced, default sizing' },
  { value: 'large' as const, label: 'Large', description: 'Larger text, easier reading' },
]

export function TypographyTab({ value, onChange }: TypographyTabProps) {
  const settings = value ?? DEFAULT_TYPOGRAPHY_SETTINGS

  const updateField = <K extends keyof TypographySettings>(
    field: K,
    newValue: TypographySettings[K],
  ) => onChange({ ...settings, [field]: newValue })

  return (
    <div className="space-y-spacing-6">
      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Typography scale</label>
        <p className="typo-caption text-muted-foreground/70 mb-spacing-2">
          Controls the overall text size across all elements
        </p>
        <div className="gap-spacing-2 flex">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('scale', option.value)}
              title={option.description}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                settings.scale === option.value && 'btn-icon-glass--active',
              )}
            >
              <TypographyPreview scale={option.value} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Size preview</label>
        <div className="card-glass rounded-spacing-2 p-spacing-3 space-y-spacing-2">
          <div className="gap-spacing-3 flex items-baseline">
            <span className="typo-caption text-muted-foreground w-12">H1</span>
            <span
              className="text-foreground font-bold"
              style={{
                fontSize:
                  settings.scale === 'small'
                    ? '1.875rem'
                    : settings.scale === 'large'
                      ? '3rem'
                      : '2.25rem',
              }}
            >
              Heading
            </span>
          </div>
          <div className="gap-spacing-3 flex items-baseline">
            <span className="typo-caption text-muted-foreground w-12">H2</span>
            <span
              className="text-foreground font-semibold"
              style={{
                fontSize:
                  settings.scale === 'small'
                    ? '1.5rem'
                    : settings.scale === 'large'
                      ? '2.25rem'
                      : '1.875rem',
              }}
            >
              Subheading
            </span>
          </div>
          <div className="gap-spacing-3 flex items-baseline">
            <span className="typo-caption text-muted-foreground w-12">Body</span>
            <span
              className="text-foreground"
              style={{
                fontSize:
                  settings.scale === 'small'
                    ? '0.875rem'
                    : settings.scale === 'large'
                      ? '1.125rem'
                      : '1rem',
              }}
            >
              Regular paragraph text
            </span>
          </div>
          <div className="gap-spacing-3 flex items-baseline">
            <span className="typo-caption text-muted-foreground w-12">Small</span>
            <span
              className="text-muted-foreground"
              style={{
                fontSize:
                  settings.scale === 'small'
                    ? '0.75rem'
                    : settings.scale === 'large'
                      ? '1rem'
                      : '0.875rem',
              }}
            >
              Caption and helper text
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
