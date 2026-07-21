'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, Building2, Check, ChevronDown, User, Users } from 'lucide-react'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { cn } from '@/lib/utils/cn'

function scopeIcon(scopeType: BrainScopeNavOption['scopeType']) {
  const cls = 'h-3 w-3 shrink-0 text-muted-foreground'
  switch (scopeType) {
    case 'user':
    case 'person':
      return <User className={cls} />
    case 'company':
      return <Building2 className={cls} />
    case 'customer':
      return <Users className={cls} />
    case 'agent':
      return <Bot className={cls} />
    default:
      return <User className={cls} />
  }
}

export function BrainTargetAvatar({
  target,
  size = 'sm',
  className,
}: {
  target: TrainableBrainTarget
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const sizeCls = size === 'xs' ? 'h-5 w-5' : size === 'md' ? 'h-7 w-7' : 'h-6 w-6'
  return (
    <span
      className={cn(
        'border-border bg-muted shrink-0 overflow-hidden rounded-full border',
        sizeCls,
        className,
      )}
      title={target.label}
    >
      {target.imageUrl ? (
        <img src={target.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {scopeIcon(target.scopeType)}
        </span>
      )}
    </span>
  )
}

export function BrainTargetAvatarStack({
  targets,
  size = 'sm',
  max = 3,
  className,
}: {
  targets: TrainableBrainTarget[]
  size?: 'xs' | 'sm' | 'md'
  max?: number
  className?: string
}) {
  if (targets.length === 0) return null
  const visible = targets.slice(0, max)
  const overflow = targets.length - visible.length
  return (
    <div className={cn('flex items-center -space-x-1.5', className)}>
      {visible.map((t) => (
        <BrainTargetAvatar key={t.scopeId} target={t} size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'border-border bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
            size === 'xs' ? 'h-5 w-5' : size === 'md' ? 'h-7 w-7' : 'h-6 w-6',
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

export function BrainTrainTargetSelect({
  targets,
  values,
  onChange,
  disabled,
  trigger,
  align = 'left',
}: {
  targets: TrainableBrainTarget[]
  values: string[]
  onChange: (scopeIds: string[]) => void
  disabled?: boolean
  /** Override trigger button (e.g. compact stack on staging row). */
  trigger?: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = targets.filter((t) => values.includes(t.scopeId))
  const display = selected.length > 0 ? selected : targets.slice(0, 1)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (targets.length === 0) return null

  const toggle = (scopeId: string) => {
    if (values.includes(scopeId)) {
      onChange(values.filter((v) => v !== scopeId))
    } else {
      onChange([...values, scopeId])
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', trigger ? 'inline-flex shrink-0' : 'w-full')}>
      {trigger ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn('inline-flex items-center', disabled && 'pointer-events-none opacity-60')}
        >
          {trigger}
        </button>
      ) : (
        <>
          <span className="body-4 text-muted-foreground mb-spacing-1 block">
            Train which brains
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'border-border surface-bg body-3 text-foreground rounded-spacing-2 h-spacing-10 flex w-full items-center gap-2 border px-3 text-left transition-colors',
              disabled ? 'cursor-default opacity-80' : 'hover:bg-hover-subtle cursor-pointer',
            )}
          >
            <BrainTargetAvatarStack targets={display} size="sm" max={3} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {selected.length === 0
                ? 'Pick a brain'
                : selected.length === 1
                  ? selected[0]!.label
                  : `${selected.length} brains`}
            </span>
            <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
          </button>
        </>
      )}
      {open ? (
        <div
          className={cn(
            'dropdown-menu-solid z-dropdown rounded-spacing-2 py-spacing-1 absolute top-full mt-1 max-h-72 min-w-56 overflow-y-auto shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            trigger ? '' : 'left-0 right-0',
          )}
        >
          {targets.map((t) => {
            const checked = values.includes(t.scopeId)
            return (
              <button
                key={t.scopeId}
                type="button"
                onClick={() => toggle(t.scopeId)}
                className={cn(
                  'body-3 hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                  checked ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'border-border flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'bg-primary border-primary' : 'bg-transparent',
                  )}
                >
                  {checked ? <Check className="text-primary-foreground h-3 w-3" /> : null}
                </span>
                <BrainTargetAvatar target={t} size="sm" />
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
