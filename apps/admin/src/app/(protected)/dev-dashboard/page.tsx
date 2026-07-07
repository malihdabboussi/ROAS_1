'use client'

import { DevDashboardContainer } from '@/features/dev-dashboard/containers/DevDashboardContainer'

export default function DevDashboardPage() {
  return (
    <section className="p-spacing-6">
      <div className="mb-spacing-6">
        <h1 className="title-h2 text-foreground">DEV DASHBOARD</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Infrastructure, errors, and agent traces at a glance.
        </p>
      </div>
      <DevDashboardContainer />
    </section>
  )
}
