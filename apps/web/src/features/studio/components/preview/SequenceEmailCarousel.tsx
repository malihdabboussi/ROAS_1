'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  SequenceEmailEditorCard,
  type SequenceEmailCardData,
  type SequenceEmailEditorSaveStatus,
} from './SequenceEmailEditorCard'

interface SequenceEmailCarouselProps {
  emails: SequenceEmailCardData[]
  activeIndex: number
  centerEmailCard: boolean
  saveStatusEmailId: string | null
  saveStatus: SequenceEmailEditorSaveStatus
  onPrevious: () => void
  onNext: () => void
  onSelectIndex: (index: number) => void
  onBodyChange: (emailId: string, html: string) => void
  onEmailSettingsChange: (
    emailId: string,
    patch: Partial<Pick<SequenceEmailCardData, 'status' | 'delay_hours' | 'subject'>>,
  ) => void
}

export function SequenceEmailCarousel({
  emails,
  activeIndex,
  centerEmailCard,
  saveStatusEmailId,
  saveStatus,
  onPrevious,
  onNext,
  onSelectIndex,
  onBodyChange,
  onEmailSettingsChange,
}: SequenceEmailCarouselProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const activeEmail = emails[activeIndex] as SequenceEmailCardData | undefined

  const swipeHandlers = {
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0]
      if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!touch || !touchStartRef.current) return
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      touchStartRef.current = null
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
      if (dx < 0) onNext()
      else onPrevious()
    },
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`px-spacing-3 flex min-h-0 flex-1 flex-col items-stretch justify-center ${
          centerEmailCard ? 'mx-auto w-full max-w-full' : ''
        }`}
        {...swipeHandlers}
      >
        {activeEmail ? (
          <div
            className={
              centerEmailCard
                ? 'container-modal-md flex min-h-0 w-full flex-1 flex-col'
                : 'flex min-h-0 w-full flex-1 flex-col'
            }
          >
            <SequenceEmailEditorCard
              email={activeEmail}
              index={activeIndex}
              onBodyChange={onBodyChange}
              onEmailSettingsChange={onEmailSettingsChange}
              saveStatus={saveStatusEmailId === activeEmail.id ? saveStatus : 'idle'}
            />
          </div>
        ) : null}
      </div>

      <div className="px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center justify-center">
        <button
          type="button"
          onClick={onPrevious}
          disabled={activeIndex === 0}
          className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 text-muted-foreground flex items-center justify-center disabled:opacity-30"
        >
          <ChevronLeft className="icon-sm" />
        </button>
        <div className="gap-spacing-2 flex items-center">
          {emails.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === activeIndex
                  ? 'indicator-dot-glass-blue h-2.5 w-2.5'
                  : 'bg-border hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={activeIndex === emails.length - 1}
          className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 text-muted-foreground flex items-center justify-center disabled:opacity-30"
        >
          <ChevronRight className="icon-sm" />
        </button>
      </div>
    </div>
  )
}
