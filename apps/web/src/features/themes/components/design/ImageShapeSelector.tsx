'use client'

import { ImageIcon } from 'lucide-react'
import type { AccentImageShapeOption } from '../../types'

interface ImageShapeSelectorProps {
  value: AccentImageShapeOption
  onChange: (value: AccentImageShapeOption) => void
  label?: string
}

const SHAPE_OPTIONS: { value: AccentImageShapeOption; label: string }[] = [
  { value: 'hard', label: 'Hard edge' },
  { value: 'blur', label: 'Soft edge' },
  { value: 'angle-right', label: 'Angle right' },
  { value: 'angle-left', label: 'Angle left' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'wave', label: 'Wave' },
]

function SlidePreview({ shape, isActive }: { shape: AccentImageShapeOption; isActive: boolean }) {
  const iconClass = isActive ? '' : 'text-[var(--color-muted-foreground)]/60'
  const containerClasses =
    'relative w-full h-full overflow-hidden rounded-sm border border-[var(--color-border)]'

  const ImageOverlay = () => (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[45%] items-center justify-center">
      <ImageIcon className={`h-4 w-4 ${iconClass}`} />
    </div>
  )

  switch (shape) {
    case 'hard':
      return (
        <div className={containerClasses}>
          <div className="absolute inset-y-0 left-0 w-[55%] bg-[var(--fill-card)]" />
          <div className="bg-muted-20 absolute inset-y-0 right-0 w-[45%]" />
          <ImageOverlay />
        </div>
      )
    case 'blur':
      return (
        <div className={containerClasses}>
          <div className="absolute inset-y-0 left-0 w-[44%] bg-[var(--fill-card)]" />
          <div className="bg-gradient-blur-reverse absolute inset-y-0 left-[44%] w-[18%]" />
          <div className="bg-muted-20 absolute inset-y-0 right-0 w-[38%]" />
          <ImageOverlay />
        </div>
      )
    case 'angle-right':
      return (
        <div className={containerClasses}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 160 90"
            preserveAspectRatio="none"
          >
            <polygon points="0,0 104,0 80,90 0,90" className="fill-card" />
            <polygon points="104,0 160,0 160,90 80,90" className="fill-muted-20" />
          </svg>
          <ImageOverlay />
        </div>
      )
    case 'angle-left':
      return (
        <div className={containerClasses}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 160 90"
            preserveAspectRatio="none"
          >
            <polygon points="0,0 80,0 104,90 0,90" className="fill-card" />
            <polygon points="80,0 160,0 160,90 104,90" className="fill-muted-20" />
          </svg>
          <ImageOverlay />
        </div>
      )
    case 'rounded':
      return (
        <div className={containerClasses}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 160 90"
            preserveAspectRatio="none"
          >
            <path d="M0,0 L96,0 Q72,45 96,90 L0,90 Z" className="fill-card" />
            <path d="M96,0 L160,0 L160,90 L96,90 Q72,45 96,0 Z" className="fill-muted-20" />
          </svg>
          <ImageOverlay />
        </div>
      )
    case 'wave':
      return (
        <div className={containerClasses}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 160 90"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L96,0 C88,15 80,15 88,30 C96,45 88,60 80,67 C72,74 80,82 88,90 L0,90 Z"
              className="fill-card"
            />
            <path
              d="M96,0 L160,0 L160,90 L88,90 C80,82 72,74 80,67 C88,60 96,45 88,30 C80,15 88,15 96,0 Z"
              className="fill-muted-20"
            />
          </svg>
          <ImageOverlay />
        </div>
      )
    default:
      return null
  }
}

export function ImageShapeSelector({
  value,
  onChange,
  label = 'Accent image shape',
}: ImageShapeSelectorProps) {
  return (
    <div className="space-y-spacing-2">
      {label && (
        <label className="body-3 font-medium text-[var(--color-muted-foreground)]">{label}</label>
      )}
      <div className="gap-spacing-2 grid grid-cols-3">
        {SHAPE_OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              title={option.label}
              className={`rounded-spacing-2 focus-visible:ring-[var(--color-primary)]/50 relative p-1.5 transition-all focus:outline-none focus-visible:ring-2 ${isSelected ? 'btn-icon-glass--active' : 'surface-glass'}`}
            >
              <div className="aspect-video w-full">
                <SlidePreview shape={option.value} isActive={isSelected} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
