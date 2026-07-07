'use client'

import { useCallback, useRef, useState } from 'react'
import { EmojiPicker } from '@ferrucc-io/emoji-picker'
import {
  Cat,
  Cherry,
  Clock,
  Dumbbell,
  Flag,
  Heart,
  Lightbulb,
  Plane,
  Search,
  Smile,
} from 'lucide-react'

const CATEGORIES = [
  { heading: 'Frequently Used', Icon: Clock, label: 'Frequently Used' },
  { heading: 'Smileys & Emotion', Icon: Smile, label: 'Smileys & People' },
  { heading: 'Animals & Nature', Icon: Cat, label: 'Animals & Nature' },
  { heading: 'Food & Drink', Icon: Cherry, label: 'Food & Drink' },
  { heading: 'Travel & Places', Icon: Plane, label: 'Travel & Places' },
  { heading: 'Activities', Icon: Dumbbell, label: 'Activities' },
  { heading: 'Objects', Icon: Lightbulb, label: 'Objects' },
  { heading: 'Symbols', Icon: Heart, label: 'Symbols' },
  { heading: 'Flags', Icon: Flag, label: 'Flags' },
]

export function BrandedEmojiPicker({
  onEmojiClick,
}: {
  onEmojiClick: (data: { emoji: string }) => void
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const focusSearch = () => {
    setActiveIdx(null)
    inputRef.current?.focus()
  }

  const scrollToCategory = useCallback((idx: number) => {
    setActiveIdx(idx)
    const cat = CATEGORIES[idx]
    if (!cat) return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const scrollContainer = wrapper.querySelector(
      'div[tabindex="0"].overflow-y-auto.relative',
    ) as HTMLElement | null
    if (!scrollContainer) return

    const target = cat.heading.toLowerCase()
    const totalHeight = scrollContainer.scrollHeight
    const approxOffset = Math.round((idx / CATEGORIES.length) * totalHeight)

    const overshoot = 120
    const jumpTo = Math.max(0, approxOffset - overshoot)
    scrollContainer.scrollTop = jumpTo

    const findAndScroll = (attempt: number) => {
      if (attempt > 12) return
      const headers = scrollContainer.querySelectorAll('[data-type="header"]')
      for (const h of headers) {
        const text = (h.textContent ?? '').toLowerCase().trim()
        if (text === target) {
          const translateMatch = (h as HTMLElement).style.transform?.match(/translateY\((\d+)px\)/)
          const pos = translateMatch
            ? parseInt(translateMatch[1]!, 10)
            : (h as HTMLElement).offsetTop
          scrollContainer.scrollTo({ top: pos, behavior: 'smooth' })
          return
        }
      }
      const direction = approxOffset > scrollContainer.scrollTop ? 300 : -300
      scrollContainer.scrollTop += direction
      requestAnimationFrame(() => findAndScroll(attempt + 1))
    }

    requestAnimationFrame(() => findAndScroll(0))
  }, [])

  return (
    <EmojiPicker
      className="branded-emoji-picker border-border text-foreground [&_h3]:text-muted-foreground w-[340px] rounded-lg border bg-[var(--color-card)] font-sans"
      emojisPerRow={9}
      emojiSize={28}
      onEmojiSelect={(emoji) => onEmojiClick({ emoji })}
    >
      {/* Category nav */}
      <div className="border-border flex items-center gap-0.5 border-b px-2 py-1">
        <button
          type="button"
          title="Search"
          onClick={focusSearch}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            activeIdx === null
              ? 'text-foreground bg-[var(--color-secondary)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-secondary)]'
          }`}
        >
          <Search className="h-4 w-4" />
        </button>
        <div className="bg-border mx-0.5 h-4 w-px" />
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            type="button"
            title={cat.label}
            onClick={() => scrollToCategory(i)}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              activeIdx === i
                ? 'text-foreground bg-[var(--color-secondary)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-secondary)]'
            }`}
          >
            <cat.Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <EmojiPicker.Header className="px-2 pb-1 pt-1.5">
        <EmojiPicker.Input
          ref={inputRef}
          placeholder="Search emoji…"
          className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 h-8 w-full rounded-md border bg-[var(--color-muted)] px-3 text-sm focus:outline-none"
          hideIcon
        />
      </EmojiPicker.Header>
      <div ref={wrapperRef}>
        <EmojiPicker.Group>
          <EmojiPicker.List containerHeight={280} />
        </EmojiPicker.Group>
      </div>
    </EmojiPicker>
  )
}
