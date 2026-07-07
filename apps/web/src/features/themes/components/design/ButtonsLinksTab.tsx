'use client'

import { cn } from '@/lib/utils/cn'
import type { ButtonDesignSettings, LinkDesignSettings } from '../../types'

interface ButtonsLinksTabProps {
  buttons: ButtonDesignSettings
  links: LinkDesignSettings
  onChangeButtons: (v: ButtonDesignSettings) => void
  onChangeLinks: (v: LinkDesignSettings) => void
}

const buttonPreviewClass =
  'flex h-8 w-16 items-center justify-center text-[11px] font-medium bg-foreground text-background dark:bg-card dark:text-foreground'

const ButtonSquare = () => <div className={`${buttonPreviewClass} rounded-none`}>Button</div>

const ButtonRoundedSm = () => <div className={`${buttonPreviewClass} rounded`}>Button</div>

const ButtonRounded = () => <div className={`${buttonPreviewClass} rounded-lg`}>Button</div>

const ButtonPill = () => <div className={`${buttonPreviewClass} rounded-full`}>Button</div>

const ShadowPreview = ({ shadow }: { shadow: string }) => (
  <div
    className="border-border bg-card absolute -right-3 -top-3 h-12 w-12 rounded-sm border"
    style={{ boxShadow: shadow }}
  />
)

const SHADOW_TOKENS: Record<ButtonDesignSettings['shadow'], string> = {
  none: 'none',
  sm: '0 3px 6px rgba(0,0,0,0.5)',
  md: '0 5px 12px rgba(0,0,0,0.6)',
  lg: '0 8px 20px rgba(0,0,0,0.7)',
}

const BUTTON_SHAPE_OPTIONS = [
  {
    value: 'square' as const,
    label: 'Square',
    Preview: ButtonSquare,
    containerClass: 'btn-icon-glass-button--square',
  },
  {
    value: 'rounded-sm' as const,
    label: 'Slightly rounded',
    Preview: ButtonRoundedSm,
    containerClass: 'btn-icon-glass-button--rounded-sm',
  },
  {
    value: 'rounded' as const,
    label: 'Rounded',
    Preview: ButtonRounded,
    containerClass: 'btn-icon-glass-button--rounded',
  },
  {
    value: 'pill' as const,
    label: 'Pill',
    Preview: ButtonPill,
    containerClass: 'btn-icon-glass-button--pill',
  },
]

const SHADOW_OPTIONS = [
  { value: 'none' as const, label: 'None' },
  { value: 'sm' as const, label: 'Small' },
  { value: 'md' as const, label: 'Medium' },
  { value: 'lg' as const, label: 'Large' },
]

export function ButtonsLinksTab({
  buttons,
  links,
  onChangeButtons,
  onChangeLinks,
}: ButtonsLinksTabProps) {
  const updateButtonField = <K extends keyof ButtonDesignSettings>(
    field: K,
    newValue: ButtonDesignSettings[K],
  ) => onChangeButtons({ ...buttons, [field]: newValue })

  const updateLinkField = <K extends keyof LinkDesignSettings>(
    field: K,
    newValue: LinkDesignSettings[K],
  ) => onChangeLinks({ ...links, [field]: newValue })

  return (
    <div className="space-y-spacing-6">
      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Button shape</label>
        <div className="gap-spacing-2 flex">
          {BUTTON_SHAPE_OPTIONS.map(({ value, label, Preview, containerClass }) => (
            <button
              key={value}
              type="button"
              onClick={() => updateButtonField('shape', value)}
              title={label}
              className={cn(
                'btn-icon-glass btn-icon-glass-button',
                containerClass,
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                buttons.shape === value && 'btn-icon-glass--active',
              )}
            >
              <Preview />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Button shadow</label>
        <div className="gap-spacing-2 flex">
          {SHADOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateButtonField('shadow', option.value)}
              title={option.label}
              className={cn(
                'btn-icon-glass btn-icon-glass-lg-circle relative overflow-hidden',
                'focus-visible:ring-primary/50 focus:outline-none focus-visible:ring-2',
                buttons.shadow === option.value && 'btn-icon-glass--active',
              )}
            >
              <ShadowPreview shadow={SHADOW_TOKENS[option.value]} />
            </button>
          ))}
        </div>
      </div>

      <div className="border-border border-t" />

      <div className="space-y-spacing-2">
        <label className="body-3 text-muted-foreground font-medium">Link style</label>
        <div className="space-y-spacing-2">
          <label className="gap-spacing-3 flex cursor-pointer items-center">
            <input
              type="radio"
              name="linkStyle"
              checked={links.style === 'underline'}
              onChange={() => updateLinkField('style', 'underline')}
              className="accent-blue h-4 w-4"
            />
            <span className="body-2 text-foreground underline">Always underline</span>
          </label>
          <label className="gap-spacing-3 flex cursor-pointer items-center">
            <input
              type="radio"
              name="linkStyle"
              checked={links.style === 'none'}
              onChange={() => updateLinkField('style', 'none')}
              className="accent-blue h-4 w-4"
            />
            <span className="body-2 text-foreground">No underline</span>
          </label>
          <label className="gap-spacing-3 flex cursor-pointer items-center">
            <input
              type="radio"
              name="linkStyle"
              checked={links.style === 'hover-underline'}
              onChange={() => updateLinkField('style', 'hover-underline')}
              className="accent-blue h-4 w-4"
            />
            <span className="body-2 text-foreground transition-all hover:underline">
              Underline on hover
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
