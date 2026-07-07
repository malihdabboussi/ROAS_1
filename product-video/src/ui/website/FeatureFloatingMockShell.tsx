import React from 'react';

/** Ported verbatim from `apps/website/src/components/feature-pages/FeatureFloatingMockShell.tsx`
 *  (only the `'use client'` directive dropped — Remotion bundles do not care). */
export function FeatureFloatingMockShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`compare-hero-card-shell border-color-glass bg-color-panel-mid relative aspect-auto min-h-[420px] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border backdrop-blur-xl ${className ?? ''}`}
    >
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </div>
  );
}
