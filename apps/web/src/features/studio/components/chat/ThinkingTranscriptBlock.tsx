'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTypewriter } from '@/lib/hooks/use-typewriter'

interface ThinkingTranscriptBlockProps {
  content: string
  isActive: boolean
}

export function ThinkingTranscriptBlock({ content, isActive }: ThinkingTranscriptBlockProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [userScrolled, setUserScrolled] = useState(false)
  const [durationSec, setDurationSec] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive && !startRef.current) {
      startRef.current = Date.now()
    }
    if (isActive) {
      const interval = setInterval(() => {
        if (startRef.current) setDurationSec(Math.round((Date.now() - startRef.current) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
    if (!isActive && startRef.current) {
      setDurationSec(Math.round((Date.now() - startRef.current) / 1000))
      setExpanded(false)
    }
    return undefined
  }, [isActive])

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, userScrolled])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setUserScrolled(!isAtBottom)
  }

  const displayContent = content
    .replace(/^Reasoning:\s*/i, '')
    .trimStart()
    .split('\n')
    .map((line) => line.replace(/^_/, '').replace(/_$/, ''))
    .join('\n')

  const { displayText } = useTypewriter({
    text: displayContent,
    enabled: isActive,
  })

  return (
    <div className="surface-secondary overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 pb-0 pl-0 pr-3 pt-2"
      >
        <span
          className={`body-3 font-medium ${isActive ? 'text-shimmer-gradient' : 'text-muted-foreground'}`}
        >
          {isActive
            ? 'Thinking...'
            : durationSec < 3
              ? 'Thought briefly'
              : `Thought for ${durationSec}s`}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="text-muted-foreground body-3 max-h-40 overflow-y-auto pb-1 pl-0 pr-3 pt-1"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {displayText}
        </div>
      )}
    </div>
  )
}
