'use client'

import type { ComponentProps } from 'react'
import { Menu } from 'lucide-react'
import { BrainScopeBreadcrumb } from './BrainScopeBreadcrumb'

type BrainScopeBreadcrumbProps = ComponentProps<typeof BrainScopeBreadcrumb>

interface BrainVisualizationBreadcrumbLayerProps {
  isOrg: boolean
  loading: BrainScopeBreadcrumbProps['loading']
  onNavigateHome: BrainScopeBreadcrumbProps['onNavigateHome']
  scope: BrainScopeBreadcrumbProps['scope']
  scopeOptions: BrainScopeBreadcrumbProps['scopeOptions']
}

export function BrainVisualizationBreadcrumbLayer({
  isOrg,
  loading,
  onNavigateHome,
  scope,
  scopeOptions,
}: BrainVisualizationBreadcrumbLayerProps) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-40 flex items-center gap-3 px-3 pb-1 pt-3 md:hidden">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="icon-md" />
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <BrainScopeBreadcrumb
            scope={scope}
            scopeOptions={scopeOptions}
            loading={loading}
            isOrg={isOrg}
            onNavigateHome={onNavigateHome}
            compact
          />
        </div>
        <span className="h-spacing-8 w-spacing-8 shrink-0" aria-hidden />
      </div>

      <div className="top-spacing-4 left-spacing-4 pointer-events-auto absolute z-40 hidden md:block">
        <BrainScopeBreadcrumb
          scope={scope}
          scopeOptions={scopeOptions}
          loading={loading}
          isOrg={isOrg}
          onNavigateHome={onNavigateHome}
        />
      </div>
    </>
  )
}
