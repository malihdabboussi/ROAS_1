'use client'

import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'

interface TeamHrChatCreditsBannerProps {
  creditsLow: boolean
  creditsLowRemaining: number | null
  creditsExhausted: boolean
}

export function TeamHrChatCreditsBanner({
  creditsLow,
  creditsLowRemaining,
  creditsExhausted,
}: TeamHrChatCreditsBannerProps) {
  if (creditsLow && !creditsExhausted) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500/5 px-4 py-2">
        <span className="body-3 text-amber-400">
          Running low on credits ({creditsLowRemaining} remaining)
        </span>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'billing' }))
          }}
          className="body-3 font-medium text-amber-400 underline hover:text-amber-300"
        >
          Buy more
        </button>
      </div>
    )
  }

  if (creditsExhausted) {
    return (
      <div className="bg-[var(--color-destructive)]/5 flex flex-col items-center gap-3 px-4 py-4">
        <p className="body-2 font-medium text-[var(--color-foreground)]">
          You&apos;ve run out of credits
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-credit-purchase'))
              useChatStore.getState().setCreditsExhausted(false)
            }}
            className="body-2 chip-glass-green rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
          >
            Buy More Credits
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'billing' }))
              useChatStore.getState().setCreditsExhausted(false)
            }}
            className="body-2 chip-glass-neutral rounded-lg px-4 py-2 font-medium transition-colors"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    )
  }

  return null
}
