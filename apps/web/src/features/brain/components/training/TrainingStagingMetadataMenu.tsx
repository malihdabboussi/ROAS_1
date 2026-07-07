'use client'

import { useEffect, useRef, type ComponentType } from 'react'
import {
  BookOpen,
  Brush,
  DollarSign,
  ExternalLink,
  Globe,
  GraduationCap,
  Layers,
  Library,
  Link as LinkIcon,
  Megaphone,
  Mic,
  Newspaper,
  NotebookPen,
  ScrollText,
  Settings,
  Target,
  X,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import type { SkDomain, SkSourceType } from '../../services/sk.service'

type MetadataMenuIcon = ComponentType<{ className?: string }>

type MetadataMenuOption<T extends string> = {
  value: T
  label: string
  icon: MetadataMenuIcon
}

export const TRAINING_STAGING_SOURCE_TYPES: Array<
  MetadataMenuOption<SkSourceType>
> = [
  { value: 'book', label: 'Book', icon: BookOpen },
  { value: 'article', label: 'Article', icon: Newspaper },
  { value: 'course', label: 'Course', icon: GraduationCap },
  { value: 'manual', label: 'Manual', icon: ScrollText },
  { value: 'notes', label: 'Notes', icon: NotebookPen },
  { value: 'transcript', label: 'Transcript', icon: Mic },
  { value: 'website', label: 'Website', icon: ExternalLink },
  { value: 'social', label: 'Social', icon: LinkIcon },
]

export const TRAINING_STAGING_DOMAINS: Array<MetadataMenuOption<SkDomain>> = [
  { value: 'general', label: 'General', icon: Globe },
  { value: 'strategy', label: 'Strategy', icon: Target },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'finance', label: 'Finance', icon: DollarSign },
  { value: 'operations', label: 'Operations', icon: Settings },
  { value: 'creative', label: 'Creative', icon: Brush },
]

export function TrainingStagingMetadataMenu<T extends string>({
  value,
  options,
  onChange,
  open,
  onOpenChange,
  ariaLabel,
  placement = 'bottom',
  placeholder,
}: {
  value: T
  options: Array<MetadataMenuOption<T>>
  onChange: (value: T) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  ariaLabel: string
  placement?: 'top' | 'bottom'
  placeholder?: { icon: MetadataMenuIcon; label: string }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const optionMatch = options.find((option) => option.value === value)
  const showingPlaceholder = !optionMatch && !!placeholder
  const current =
    optionMatch ??
    (placeholder
      ? { value: '' as T, label: placeholder.label, icon: placeholder.icon }
      : options[0]!)
  const TriggerIcon = current.icon

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onOpenChange])

  return (
    <div ref={ref} className="relative">
      <Tooltip label={`${ariaLabel}: ${current.label}`} side="top" delayMs={250}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-label={`${ariaLabel}: ${current.label}`}
          className={cn(
            'rounded-spacing-1 h-spacing-6 w-spacing-6 flex items-center justify-center transition-colors',
            'hover:bg-hover-subtle hover:text-foreground',
            showingPlaceholder ? 'text-muted-foreground/60' : 'text-muted-foreground',
          )}
        >
          <TriggerIcon className="icon-sm" />
        </button>
      </Tooltip>
      {open ? (
        <div
          className={cn(
            'surface-card card-elevated border-border rounded-spacing-2 absolute right-0 z-20 w-[180px] border p-spacing-1',
            placement === 'top' ? 'bottom-full mb-spacing-1' : 'top-full mt-spacing-1',
          )}
        >
          {placeholder && optionMatch ? (
            <button
              type="button"
              onClick={() => {
                onChange('' as T)
                onOpenChange(false)
              }}
              className="body-3 text-muted-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full items-center text-left"
            >
              <X className="icon-md shrink-0" />
              Clear
            </button>
          ) : null}
          {options.map((option) => {
            const OptionIcon = option.icon
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  onOpenChange(false)
                }}
                className={cn(
                  'body-3 hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full items-center text-left',
                  active ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                <OptionIcon className="icon-md shrink-0" />
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export const TRAINING_STAGING_TYPE_PLACEHOLDER = {
  icon: Library,
  label: 'Type',
} satisfies { icon: MetadataMenuIcon; label: string }

export const TRAINING_STAGING_DOMAIN_PLACEHOLDER = {
  icon: Layers,
  label: 'Domain',
} satisfies { icon: MetadataMenuIcon; label: string }
