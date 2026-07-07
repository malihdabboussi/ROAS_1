'use client'

import { Suspense } from 'react'
import { PlatformEmailContainer } from '@/features/platform-email'

export default function PlatformEmailPage() {
  return (
    <div className="p-spacing-6 w-full">
      <div className="mb-spacing-6">
        <h1 className="title-h1 text-foreground">EMAIL SETTINGS</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Platform SendGrid domain and sender for waitlist invites and transactional email
        </p>
      </div>
      <Suspense fallback={<div className="body-3 text-muted-foreground">Loading…</div>}>
        <PlatformEmailContainer />
      </Suspense>
    </div>
  )
}
