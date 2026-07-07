'use client'

import { flushSync } from 'react-dom'
import type React from 'react'
import type { MissionAgent } from '@/features/mission-control/types'

export function AgentInfoEditableName({
  selected,
  level,
  isSystemLikeAgent,
  setNameValue,
  handleNameSave,
}: {
  selected: MissionAgent
  level: string
  isSystemLikeAgent: boolean
  setNameValue: React.Dispatch<React.SetStateAction<string>>
  handleNameSave: () => Promise<void>
}) {
  if (level === 'system' || isSystemLikeAgent) {
    return (
      <h2 className="text-foreground truncate text-base font-bold uppercase leading-tight">
        {selected.name}
      </h2>
    )
  }

  return (
    <h2 className="text-foreground min-w-0 text-base font-bold uppercase leading-tight">
      <span
        contentEditable
        suppressContentEditableWarning
        className="hover:text-primary cursor-pointer outline-none transition-colors"
        onBlur={(e) => {
          const val = e.currentTarget.textContent?.trim() ?? ''
          if (val && val !== selected.name) {
            flushSync(() => setNameValue(val))
            void handleNameSave()
          } else {
            e.currentTarget.textContent = selected.name
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            e.currentTarget.textContent = selected.name
            e.currentTarget.blur()
          }
        }}
      >
        {selected.name}
      </span>
    </h2>
  )
}
