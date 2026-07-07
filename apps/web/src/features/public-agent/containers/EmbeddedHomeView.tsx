'use client'

import { ChevronRight, MessageSquare, X } from 'lucide-react'
import type { WidgetConfigResponse, WidgetHomeConfig } from '../services/public-agent.service'

interface EmbeddedHomeViewProps {
  config: WidgetConfigResponse
  homeConfig: WidgetHomeConfig
  accent: string
  accentText: string
  onNavigate: (tab: string) => void
  onClose?: () => void
}

export function EmbeddedHomeView({
  config,
  homeConfig,
  accent,
  accentText,
  onNavigate,
  onClose,
}: EmbeddedHomeViewProps) {
  const heroText = homeConfig.heroText || 'Hello there.\nHow can we help?'
  const logoUrl = config.imageUrl?.trim() || null
  const showRecent = homeConfig.showRecentMessage !== false
  const ctaCards = homeConfig.ctaCards ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="relative px-5 pb-12 pt-12" style={{ background: accent, color: accentText }}>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 transition-opacity hover:opacity-80"
            style={{ color: accentText }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {logoUrl && <img src={logoUrl} alt="" className="mb-4 h-8 w-8 rounded-lg object-cover" />}
        <h2 className="whitespace-pre-line text-[22px] font-bold leading-tight">{heroText}</h2>
      </div>

      <div className="relative z-10 -mt-8 flex flex-col gap-3 px-4 pb-4">
        {showRecent && (
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className="hover:bg-neutral-750 flex items-center gap-3 rounded-2xl border border-neutral-700/60 bg-neutral-800 p-3.5 text-left transition-colors"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: accent, color: accentText }}
            >
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {config.title || config.name}
              </p>
              <p className="truncate text-xs text-white/50">
                {config.greeting || 'Start a conversation'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
          </button>
        )}

        {ctaCards.map((card) => (
          <a
            key={card.id}
            href={card.linkUrl || '#'}
            target={card.linkUrl ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.07]"
          >
            {card.imageUrl && (
              <img src={card.imageUrl} alt="" className="h-36 w-full object-cover" />
            )}
            <div className="p-3.5">
              <p className="text-sm font-medium text-white">{card.title}</p>
              {card.body && (
                <p className="mt-1 text-xs leading-relaxed text-white/60">{card.body}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
