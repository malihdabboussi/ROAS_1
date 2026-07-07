'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

const STORAGE_KEY = 'vibey-home-automations-team-activity'

export function useAutomationsTeamActivity() {
  const [teamActivity, setTeamActivity] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setTeamActivity(window.sessionStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  const toggleTeamActivity = useCallback(() => {
    setTeamActivity((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(STORAGE_KEY, String(next))
      }
      return next
    })
  }, [])

  return { teamActivity, toggleTeamActivity }
}

export function AutomationsTeamActivityToggle({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <Tooltip label={active ? 'Showing team activity' : 'Show team activity'} side="bottom">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label={active ? 'Showing team activity' : 'Show team activity'}
        className={cn(
          'rounded-md p-1 transition-colors',
          active
            ? 'text-foreground bg-[var(--color-hover-subtle)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]',
        )}
      >
        <Users className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Tooltip>
  )
}
