'use client'

import { GraduationCap } from 'lucide-react'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { buildBrainScopeBreadcrumbs } from '@/features/brain/lib/brain-scope-breadcrumb.util'
import { cn } from '@/lib/utils/cn'
import { BrainScopeBreadcrumbDropdown } from './BrainScopeBreadcrumbDropdown'

export function BrainScopeBreadcrumb({
  scope,
  scopeOptions,
  loading = false,
  isOrg,
  onNavigateHome,
  className,
  compact = false,
}: {
  scope: BrainScopeNavOption | undefined
  scopeOptions: BrainScopeNavOption[]
  loading?: boolean
  isOrg: boolean
  onNavigateHome: () => void
  className?: string
  compact?: boolean
}) {
  const segments = buildBrainScopeBreadcrumbs(scope)

  if (loading) {
    return (
      <nav
        aria-label="Brain breadcrumb"
        className={cn('flex min-w-0 items-center gap-1.5', className)}
      >
        <span className="body-3 text-muted-foreground truncate">Brain</span>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Brain breadcrumb"
      className={cn('flex min-w-0 items-center gap-1.5', compact ? 'body-3' : 'body-3', className)}
    >
      {segments.map((segment, index) => {
        const isFirst = index === 0
        const isRootLink = isFirst && !segment.isCurrent
        const isCurrent = segment.isCurrent

        return (
          <span key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? (
              <span className="text-muted-foreground/50 shrink-0 select-none" aria-hidden>
                /
              </span>
            ) : null}
            {isCurrent ? (
              <BrainScopeBreadcrumbDropdown
                scopeOptions={scopeOptions}
                selectedScope={scope}
                loading={loading}
                isOrg={isOrg}
                triggerLabel={segment.label}
                compact={compact}
                onNavigateHome={onNavigateHome}
              />
            ) : isRootLink ? (
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-muted-foreground hover:text-foreground gap-spacing-1 flex min-w-0 max-w-[140px] items-center transition-colors"
              >
                <GraduationCap className="icon-xs shrink-0" />
                <span className="truncate">{segment.label}</span>
              </button>
            ) : (
              <span
                className="text-muted-foreground min-w-0 max-w-[160px] truncate"
                title={segment.label}
              >
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
