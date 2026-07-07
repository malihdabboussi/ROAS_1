'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { LibraryAgentProfileCard } from './LibraryAgentProfileCard'

export function AgentLibraryCarousel({ agents }: { agents: PublicAgentLibraryRow[] }) {
  const [currentIndex, setCurrentIndex] = useState(Math.floor(agents.length / 2))

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % agents.length)
  }, [agents.length])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + agents.length) % agents.length)
  }, [agents.length])

  useEffect(() => {
    const timer = setInterval(handleNext, 4000)
    return () => clearInterval(timer)
  }, [handleNext])

  if (agents.length === 0) return null

  const total = agents.length

  return (
    <div className="relative w-full">
      {/* Stage ≥ card height (LibraryAgentProfileCard is 580px) so hero overflow-hidden does not clip top/bottom */}
      <div className="relative flex h-[620px] w-full items-center justify-center overflow-visible [perspective:1200px] md:h-[640px]">
        {agents.map((row, index) => {
          const offset = index - currentIndex
          let pos = ((offset % total) + total) % total
          if (pos > Math.floor(total / 2)) pos = pos - total

          const isCenter = pos === 0
          const isAdjacent = Math.abs(pos) === 1

          return (
            <div
              key={row.role_key}
              className="absolute flex items-center justify-center transition-all duration-500 ease-in-out"
              style={{
                width: 'min(90%, 380px)',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${pos * 55}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                pointerEvents: isCenter ? 'auto' : 'none',
              }}
            >
              <LibraryAgentProfileCard
                row={row}
                fixedTab={(['info', 'skills', 'comms', 'context'] as const)[index % 4]}
              />
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handlePrev}
        className="chip-glass-neutral absolute left-2 top-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm sm:left-8 md:flex"
        style={{ transform: 'translateY(-50%)' }}
        aria-label="Previous agent"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="chip-glass-neutral absolute right-2 top-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm sm:right-8 md:flex"
        style={{ transform: 'translateY(-50%)' }}
        aria-label="Next agent"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
    </div>
  )
}
