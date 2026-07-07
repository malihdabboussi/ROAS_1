'use client'

import { Ban } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { cn } from '@/lib/utils/cn'
import type { SlideDesignSettings } from '../../types'

// import { ImageShapeSelector } from './ImageShapeSelector' // commented out with Accent image shape

interface SlidesDesignTabProps {
  value: SlideDesignSettings
  onChange: (v: SlideDesignSettings) => void
}

const CornerPreview = ({ radius }: { radius: string }) => (
  <div
    className="border-border bg-card absolute -bottom-3 -left-3 h-12 w-12 border"
    style={{ borderTopRightRadius: radius }}
  />
)

const ShadowPreview = ({ shadow }: { shadow: string }) => (
  <div
    className="border-border bg-card absolute -right-3 -top-3 h-12 w-12 rounded-sm border"
    style={{ boxShadow: shadow }}
  />
)

const BorderPreview = ({ width }: { width: string }) => (
  <div
    className="bg-foreground w-8 rounded-full"
    style={{ height: width === '0px' ? '2px' : width, opacity: width === '0px' ? 0.3 : 1 }}
  />
)

const ROUNDNESS_TOKENS = {
  none: '0px',
  sm: '8px',
  md: '16px',
  lg: '32px',
  xl: '64px',
}

const BORDER_TOKENS = {
  none: '0px',
  thin: '1px',
  medium: '2px',
  thick: '3px',
}

function hexToRgbSimple(hex: string): string {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function getShadowPreview(
  size: 'none' | 'sm' | 'md' | 'lg',
  color?: string,
  opacity?: number,
): string {
  if (size === 'none') return 'none'
  const rgb = color ? hexToRgbSimple(color) : '0, 0, 0'
  const baseOpacity = ((opacity ?? 30) / 100) * 1.5
  const clampedOpacity = Math.min(baseOpacity, 1).toFixed(2)
  const previewShadows: Record<'sm' | 'md' | 'lg', string> = {
    sm: `0 3px 6px rgba(${rgb}, ${clampedOpacity})`,
    md: `0 5px 12px rgba(${rgb}, ${clampedOpacity})`,
    lg: `0 8px 20px rgba(${rgb}, ${clampedOpacity})`,
  }
  return previewShadows[size]
}

const ROUNDNESS_OPTIONS = [
  { value: 'none' as const, label: 'Sharp' },
  { value: 'sm' as const, label: 'Slight' },
  { value: 'md' as const, label: 'Medium' },
  { value: 'lg' as const, label: 'Large' },
  { value: 'xl' as const, label: 'Extra large' },
]

const SHADOW_OPTIONS = [
  { value: 'none' as const, label: 'None' },
  { value: 'sm' as const, label: 'Small' },
  { value: 'md' as const, label: 'Medium' },
  { value: 'lg' as const, label: 'Large' },
]

const BORDER_OPTIONS = [
  { value: 'none' as const, label: 'None' },
  { value: 'thin' as const, label: 'Thin' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'thick' as const, label: 'Thick' },
]

export function SlidesDesignTab({ value, onChange }: SlidesDesignTabProps) {
  const update = <K extends keyof SlideDesignSettings>(field: K, v: SlideDesignSettings[K]) =>
    onChange({ ...value, [field]: v })

  return (
    <div className="space-y-spacing-6">
      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Roundness</label>
        <div className="gap-spacing-2 flex">
          {ROUNDNESS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update('borderRadius', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                value.borderRadius === option.value && 'btn-icon-glass--active',
              )}
            >
              <CornerPreview radius={ROUNDNESS_TOKENS[option.value]} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Slide shadow</label>
        <div className="gap-spacing-2 flex">
          {SHADOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update('shadow', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                value.shadow === option.value && 'btn-icon-glass--active',
              )}
            >
              <ShadowPreview
                shadow={getShadowPreview(option.value, value.shadowColor, value.shadowOpacity)}
              />
            </button>
          ))}
        </div>
      </div>

      {value.shadow !== 'none' && (
        <div className="space-y-spacing-4">
          <ColorPicker
            label="Shadow color"
            value={value.shadowColor || '#000000'}
            onChange={(c) => update('shadowColor', c)}
          />
          <div className="space-y-spacing-2">
            <div className="flex items-center justify-between">
              <label className="body-3 text-muted-foreground font-medium">Shadow opacity</label>
              <span className="body-3 text-muted-foreground tabular-nums">
                {value.shadowOpacity ?? 30}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={value.shadowOpacity ?? 30}
              onChange={(e) => update('shadowOpacity', parseInt(e.target.value, 10))}
              className="slider-opacity"
            />
          </div>
        </div>
      )}

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Slide border</label>
        <div className="gap-spacing-1 rounded-spacing-2 bg-muted/30 flex w-fit p-1">
          {BORDER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => update('borderWidth', o.value)}
              title={o.label}
              className={cn(
                'rounded-spacing-1 flex h-10 w-12 items-center justify-center border border-transparent transition-all',
                value.borderWidth === o.value
                  ? 'btn-icon-glass--active'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              {o.value === 'none' ? (
                <Ban className="h-5 w-5" />
              ) : (
                <BorderPreview width={BORDER_TOKENS[o.value]} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Slide opacity - commented out for now
      <div className="space-y-spacing-2">
        <div className="flex items-center justify-between">
          <label className="body-3 font-medium text-muted-foreground">Slide opacity</label>
          <span className="body-3 text-muted-foreground tabular-nums">{value.transparency}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={value.transparency}
          onChange={(e) => update('transparency', parseInt(e.target.value, 10))}
          className="slider-opacity"
        />
      </div>
      */}

      {/* Accent image shape - commented out for now
      <ImageShapeSelector
        value={value.accentImageShape}
        onChange={(v) => update('accentImageShape', v)}
      />
      */}
    </div>
  )
}
