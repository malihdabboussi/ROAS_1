'use client'

import { cn } from '@/lib/utils/cn'
import type { SpacingDensity, SpacingSettings } from '../../types'
import { DEFAULT_SPACING_SETTINGS } from '../../types'

interface SpacingTabProps {
  value: SpacingSettings | undefined
  onChange: (value: SpacingSettings) => void
}

interface SpacingPreviewProps {
  density: SpacingDensity
  type: 'section' | 'element' | 'paragraph'
}

const barStyle = { backgroundColor: 'rgba(var(--color-foreground-rgb), 0.6)' }

const SpacingPreview = ({ density, type }: SpacingPreviewProps) => {
  const gapSizes: Record<SpacingDensity, Record<'section' | 'element' | 'paragraph', number>> = {
    compact: { section: 2, element: 2, paragraph: 1 },
    normal: { section: 4, element: 3, paragraph: 2 },
    relaxed: { section: 6, element: 4, paragraph: 3 },
    spacious: { section: 8, element: 6, paragraph: 4 },
  }
  const gap = gapSizes[density][type]

  if (type === 'section') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ gap: `${gap}px` }}>
        <div className="h-1.5 w-8 rounded-full" style={barStyle} />
        <div className="h-1.5 w-8 rounded-full" style={barStyle} />
      </div>
    )
  }

  if (type === 'element') {
    return (
      <div className="grid grid-cols-2" style={{ gap: `${gap}px` }}>
        <div className="h-3 w-3 rounded-sm" style={barStyle} />
        <div className="h-3 w-3 rounded-sm" style={barStyle} />
        <div className="h-3 w-3 rounded-sm" style={barStyle} />
        <div className="h-3 w-3 rounded-sm" style={barStyle} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center" style={{ gap: `${gap}px` }}>
      <div className="h-0.5 w-8 rounded-full" style={barStyle} />
      <div className="h-0.5 w-6 rounded-full" style={barStyle} />
      <div className="h-0.5 w-7 rounded-full" style={barStyle} />
    </div>
  )
}

const SECTION_OPTIONS = [
  { value: 'compact' as const, label: 'Compact' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'relaxed' as const, label: 'Relaxed' },
  { value: 'spacious' as const, label: 'Spacious' },
]

const ELEMENT_OPTIONS = [
  { value: 'compact' as const, label: 'Tight' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'relaxed' as const, label: 'Relaxed' },
  { value: 'spacious' as const, label: 'Spacious' },
]

const PARAGRAPH_OPTIONS = [
  { value: 'compact' as const, label: 'Tight' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'relaxed' as const, label: 'Relaxed' },
  { value: 'spacious' as const, label: 'Spacious' },
]

export function SpacingTab({ value, onChange }: SpacingTabProps) {
  const settings = value ?? DEFAULT_SPACING_SETTINGS

  const updateField = <K extends keyof SpacingSettings>(field: K, newValue: SpacingSettings[K]) =>
    onChange({ ...settings, [field]: newValue })

  return (
    <div className="space-y-spacing-6">
      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Section spacing</label>
        <p className="typo-caption text-muted-foreground/70 mb-spacing-2">
          Controls vertical padding between sections
        </p>
        <div className="gap-spacing-2 flex">
          {SECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('sectionDensity', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                settings.sectionDensity === option.value && 'btn-icon-glass--active',
              )}
            >
              <SpacingPreview density={option.value} type="section" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Element gaps</label>
        <p className="typo-caption text-muted-foreground/70 mb-spacing-2">
          Controls spacing between cards, grids, and form fields
        </p>
        <div className="gap-spacing-2 flex">
          {ELEMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('elementDensity', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                settings.elementDensity === option.value && 'btn-icon-glass--active',
              )}
            >
              <SpacingPreview density={option.value} type="element" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Paragraph spacing</label>
        <p className="typo-caption text-muted-foreground/70 mb-spacing-2">
          Controls spacing between text blocks and list items
        </p>
        <div className="gap-spacing-2 flex">
          {PARAGRAPH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('paragraphDensity', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                settings.paragraphDensity === option.value && 'btn-icon-glass--active',
              )}
            >
              <SpacingPreview density={option.value} type="paragraph" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
