'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { resolveMarketingSiteUrl } from '@/lib/platform/platform-urls'

export function ConversionBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 px-4 py-2 md:px-6">
      <p className="body-4 text-foreground/80 min-w-0 truncate">
        Build your own AI team with <span className="font-semibold text-white">Vibey</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={`${resolveMarketingSiteUrl()}/register`}
          target="_blank"
          rel="noopener noreferrer"
          className="body-4 rounded-full bg-white/10 px-3.5 py-1 font-medium text-white transition-colors hover:bg-white/20"
        >
          Get Started
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
