'use client'

import type { ComponentType, ReactNode } from 'react'
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  label: string
  count: number
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  label,
  count,
  collapsed,
  onToggle,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="group/header hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center transition-colors"
      >
        <span className="typo-caption text-muted-foreground/80 uppercase">{label}</span>
        <span className="body-3 text-muted-foreground ml-auto flex h-5 w-5 items-center justify-center">
          <span className="group-hover/header:hidden">{count}</span>
          <span className="hidden group-hover/header:inline-flex">
            {collapsed ? (
              <ChevronRight className="icon-xs" />
            ) : (
              <ChevronDown className="icon-xs" />
            )}
          </span>
        </span>
      </button>
      {!collapsed && children}
    </div>
  )
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="px-spacing-3 py-spacing-4 text-center">
      <AlertCircle className="text-destructive/40 mx-auto mb-1 h-6 w-6" />
      <p className="typo-caption text-muted-foreground">{message}</p>
    </div>
  )
}

export function EmptyBlock({
  label,
  icon: Icon,
}: {
  label: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="px-spacing-6 py-spacing-8 flex h-full flex-col items-center justify-center">
      {Icon && <Icon className="text-muted-foreground/30 mb-spacing-3 h-8 w-8" />}
      <p className="body-2 text-muted-foreground/50 text-center">{label}</p>
    </div>
  )
}
