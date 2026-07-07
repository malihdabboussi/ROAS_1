'use client'

import { Search } from 'lucide-react'

const GRID_CELLS = 16

/**
 * Empty Agenda — premium desk-calendar icon matching the inspiration image.
 * Uses a dark body, subtle filled grid, and realistic spiral rings.
 */
export function AgendaEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        {/* Spiral Rings */}
        <div className="absolute -top-1.5 left-0 right-0 z-[2] flex justify-center gap-6">
          <div className="h-3 w-2 rounded-full bg-[#2A2A2E] shadow-sm ring-1 ring-white/5" />
          <div className="h-3 w-2 rounded-full bg-[#2A2A2E] shadow-sm ring-1 ring-white/5" />
        </div>

        {/* Calendar Body */}
        <div className="relative aspect-square w-full rounded-[16px] bg-[#1C1C1E] shadow-2xl ring-1 ring-white/10">
          {/* Inner Grid */}
          <div className="absolute inset-0 flex items-center justify-center p-3.5">
            <div className="grid w-full grid-cols-4 gap-1.5">
              {Array.from({ length: GRID_CELLS }, (_, i) => (
                <div key={i} className="aspect-square w-full rounded-[3px] bg-white/[0.06]" />
              ))}
            </div>
          </div>

          {/* Search Badge */}
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-white/20 bg-[#2C2C2E] shadow-lg">
            <Search className="h-3 w-3 text-white opacity-90" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}
