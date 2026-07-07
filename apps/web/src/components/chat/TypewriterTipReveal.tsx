'use client'

import { useEffect, useRef, useState } from 'react'

type Phase = 'typing' | 'holding' | 'erasing'

export interface TypewriterTipRevealProps {
  text: string
  className?: string
  typingDurationMs?: number
  holdMs?: number
  erasingDurationMs?: number
  onCycleComplete?: () => void
}

/**
 * Types `text` in over `typingDurationMs`, holds for `holdMs`,
 * then types it back out over `erasingDurationMs` and fires `onCycleComplete`.
 */
export function TypewriterTipReveal({
  text,
  className,
  typingDurationMs = 2000,
  holdMs = 26000,
  erasingDurationMs = 2000,
  onCycleComplete,
}: TypewriterTipRevealProps) {
  const [displayLength, setDisplayLength] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const completeFiredRef = useRef(false)

  useEffect(() => {
    setDisplayLength(0)
    setPhase('typing')
    completeFiredRef.current = false
  }, [text])

  useEffect(() => {
    if (phase !== 'typing') return
    if (text.length === 0) {
      setPhase('holding')
      return
    }

    const stepMs = Math.max(15, Math.floor(typingDurationMs / text.length))
    const interval = setInterval(() => {
      setDisplayLength((prev) => (prev >= text.length ? prev : prev + 1))
    }, stepMs)
    return () => clearInterval(interval)
  }, [phase, text, typingDurationMs])

  useEffect(() => {
    if (phase === 'typing' && text.length > 0 && displayLength >= text.length) {
      setPhase('holding')
    }
  }, [phase, displayLength, text.length])

  useEffect(() => {
    if (phase !== 'holding') return
    const timeout = setTimeout(() => setPhase('erasing'), holdMs)
    return () => clearTimeout(timeout)
  }, [phase, holdMs])

  useEffect(() => {
    if (phase !== 'erasing') return
    if (text.length === 0) return

    const stepMs = Math.max(15, Math.floor(erasingDurationMs / text.length))
    const interval = setInterval(() => {
      setDisplayLength((prev) => (prev <= 0 ? 0 : prev - 1))
    }, stepMs)
    return () => clearInterval(interval)
  }, [phase, text, erasingDurationMs])

  useEffect(() => {
    if (phase === 'erasing' && displayLength <= 0 && !completeFiredRef.current) {
      completeFiredRef.current = true
      onCycleComplete?.()
    }
  }, [phase, displayLength, onCycleComplete])

  return (
    <span className={`typo-xs text-muted-foreground inline ${className ?? ''}`.trim()}>
      {text.slice(0, displayLength)}
      <span className="animate-pulse">|</span>
    </span>
  )
}
