'use client'

import { useEffect, useMemo, useState } from 'react'

interface UseTypewriterOptions {
  text: string
  enabled: boolean
  wordsPerTick?: number
  intervalMs?: number
}

interface UseTypewriterResult {
  displayText: string
  isRevealing: boolean
}

function getWordEndPositions(text: string): number[] {
  const positions: number[] = []
  const re = /\S+/g
  let match: RegExpExecArray | null = null
  while ((match = re.exec(text)) !== null) {
    positions.push(match.index + match[0].length)
  }
  return positions
}

const LATE_MOUNT_WORD_THRESHOLD = 50

export function useTypewriter({
  text,
  enabled,
  wordsPerTick = 3,
  intervalMs = 30,
}: UseTypewriterOptions): UseTypewriterResult {
  const wordEnds = useMemo(() => getWordEndPositions(text), [text])
  const [revealedWords, setRevealedWords] = useState(() => {
    if (!enabled) return wordEnds.length
    if (wordEnds.length > LATE_MOUNT_WORD_THRESHOLD) return wordEnds.length
    return 0
  })

  useEffect(() => {
    if (!enabled) {
      setRevealedWords(wordEnds.length)
      return
    }
    setRevealedWords((prev) => (prev > wordEnds.length ? wordEnds.length : prev))
  }, [enabled, wordEnds.length])

  useEffect(() => {
    if (!enabled) return
    if (revealedWords >= wordEnds.length) return
    const step = Math.max(1, wordsPerTick)
    const tick = Math.max(10, intervalMs)
    const id = setInterval(() => {
      setRevealedWords((prev) => Math.min(wordEnds.length, prev + step))
    }, tick)
    return () => clearInterval(id)
  }, [enabled, intervalMs, revealedWords, wordEnds.length, wordsPerTick])

  const displayText = useMemo(() => {
    if (!enabled) return text
    if (wordEnds.length === 0) return ''
    if (revealedWords <= 0) return ''
    const endIndex = wordEnds[Math.min(revealedWords, wordEnds.length) - 1] ?? text.length
    return text.slice(0, endIndex)
  }, [enabled, revealedWords, text, wordEnds])

  return {
    displayText,
    isRevealing: enabled && revealedWords < wordEnds.length,
  }
}
