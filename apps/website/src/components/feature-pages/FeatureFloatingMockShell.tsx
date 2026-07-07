'use client'

import React from 'react'

export function FeatureFloatingMockShell({
  children,
  className,
  hideBrainGrid,
}: {
  children: React.ReactNode
  className?: string
  /** When true, omit the decorative brain/grid overlay inside the shell (marketing mockups that should match plain app chrome). */
  hideBrainGrid?: boolean
}) {
  return (
    <div
      className={`compare-hero-card-shell border-color-glass bg-color-panel-mid relative aspect-auto min-h-[420px] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border backdrop-blur-xl ${className ?? ''}`}
    >
      {!hideBrainGrid ? (
        <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      ) : null}
      {children}
    </div>
  )
}
