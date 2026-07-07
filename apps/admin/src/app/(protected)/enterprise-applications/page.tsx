'use client'

import { Suspense } from 'react'
import { EnterpriseApplicationsContainer } from '@/features/enterprise-applications'

export default function EnterpriseApplicationsPage() {
  return (
    <div className="p-spacing-6 w-full">
      <div className="mb-spacing-6">
        <h1 className="title-h1 text-foreground">ENTERPRISE APPLICATIONS</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Review and manage enterprise plan requests
        </p>
      </div>

      <Suspense fallback={<div className="body-3 text-muted-foreground">Loading…</div>}>
        <EnterpriseApplicationsContainer />
      </Suspense>
    </div>
  )
}
