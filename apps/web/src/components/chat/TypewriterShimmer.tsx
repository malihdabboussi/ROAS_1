'use client'

import { useEffect, useState } from 'react'

export function TypewriterShimmer({
  text,
  typingSpeed = 40,
}: {
  text: string
  typingSpeed?: number
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText('')
    setIsComplete(false)

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsComplete(true)
        clearInterval(interval)
      }
    }, typingSpeed)

    return () => clearInterval(interval)
  }, [text, typingSpeed])

  return (
    <span
      className={`body-3 inline-block font-medium ${
        isComplete
          ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]'
          : 'text-muted-foreground'
      }`}
    >
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  )
}
