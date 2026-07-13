'use client'

import type { ReactNode } from 'react'

export function HomeDashboardV4Shell({ children }: { children: ReactNode }) {
  return (
    <div className="home-dashboard-v4 relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="home-dashboard-v4-hero-glow" aria-hidden />
      <div className="home-dashboard-v4-hero-grid" aria-hidden />
      <div className="home-dashboard-v4-column">{children}</div>
    </div>
  )
}

export function HomeDashboardV4Greeting({
  greeting,
  firstName,
}: {
  greeting: string
  firstName: string
}) {
  return (
    <div className="text-center">
      <h1 className="home-dashboard-v4-greeting">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
    </div>
  )
}
