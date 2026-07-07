'use client'

import { useEffect, useState, type RefObject } from 'react'
import { X } from 'lucide-react'

const STORAGE_PREFIX = 'team-dm-scope-banner-dismissed:'

interface ConversationScopeBannerProps {
  conversationId: string | null
  addButtonRef?: RefObject<HTMLButtonElement | null>
  onAddClick?: () => void
}

export function ConversationScopeBanner({
  conversationId,
  addButtonRef,
  onAddClick,
}: ConversationScopeBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!conversationId) {
      setDismissed(false)
      return
    }
    setDismissed(window.localStorage.getItem(`${STORAGE_PREFIX}${conversationId}`) === '1')
  }, [conversationId])

  if (!conversationId || dismissed) return null

  return (
    <div className="banner-glass-amber banner-glass-amber-py-tight mb-spacing-2 gap-spacing-2 flex items-center">
      <p className="body-4 min-w-0 flex-1">Add this conversation to a campaign and a space.</p>
      {onAddClick ? (
        <button
          ref={addButtonRef}
          type="button"
          className="button-glass-neutral typo-xs rounded-spacing-2 px-spacing-2 py-spacing-1 shrink-0 font-medium"
          onClick={onAddClick}
        >
          Add
        </button>
      ) : null}
      <button
        type="button"
        className="btn-icon-bare shrink-0"
        aria-label="Dismiss"
        onClick={() => {
          window.localStorage.setItem(`${STORAGE_PREFIX}${conversationId}`, '1')
          setDismissed(true)
        }}
      >
        <X className="icon-xs" aria-hidden />
      </button>
    </div>
  )
}
