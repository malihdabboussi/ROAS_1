'use client'

import { resolveMarketingSiteUrl } from '@/lib/platform/platform-urls'

export function PoweredByVibey() {
  return (
    <a
      href={resolveMarketingSiteUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 transition-all hover:border-white/20 hover:bg-black/80"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="url(#vibey-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="vibey-grad" x1="2" y1="2" x2="22" y2="22">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
      </svg>
      <span className="body-4 text-muted-foreground">Powered by</span>
      <span className="body-4 font-semibold text-white">Vibey</span>
    </a>
  )
}
