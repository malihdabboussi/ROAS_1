'use client'

import { Key } from 'lucide-react'

export default function ApiKeysPageContent() {
  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <div className="max-w-2xl">
        <div className="section-card p-spacing-6">
          <div className="gap-spacing-3 mb-spacing-4 flex items-center">
            <div className="rounded-spacing-2 bg-secondary flex h-10 w-10 items-center justify-center">
              <Key className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="title-h5 text-foreground">API Keys</h1>
              <p className="body-3 text-muted-foreground">Manage your API access tokens</p>
            </div>
          </div>

          <div className="rounded-spacing-2 bg-secondary/50 p-spacing-8 text-center">
            <p className="body-2 text-muted-foreground">API key management coming soon</p>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              You&apos;ll be able to create and manage API keys for programmatic access to ROAS.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
