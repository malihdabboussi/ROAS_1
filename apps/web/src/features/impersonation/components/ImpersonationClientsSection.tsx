'use client'

import * as React from 'react'
import { UserCog } from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { clearOrgSensitiveState, navigateHomeAfterOrgSwitch } from '@/lib/utils/clear-org-state'
import {
  getImpersonationFromStorage,
  setImpersonationStorage,
} from '@/lib/utils/impersonation-storage'
import { clearActiveOrgStorage } from '@/lib/utils/org-storage'
import {
  fetchImpersonationTargets,
  startImpersonation,
  type ImpersonationTarget,
} from '../services/impersonation-api'

const FILTER_THRESHOLD = 8

/**
 * "Clients" group inside the workspace switcher submenu — superadmin only.
 * Selecting a client starts an audited impersonation session: the whole app
 * then runs against that client's account until exited via the banner.
 */
export function ImpersonationClientsSection({ onSelect }: { onSelect: () => void }) {
  const { isSuperadmin } = useUserRole()
  const [targets, setTargets] = React.useState<ImpersonationTarget[] | null>(null)
  const [filter, setFilter] = React.useState('')
  const [startingId, setStartingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isSuperadmin || targets !== null) return
    let cancelled = false
    void fetchImpersonationTargets()
      .then((res) => {
        if (!cancelled) setTargets(res.targets)
      })
      .catch(() => {
        if (!cancelled) setTargets([])
      })
    return () => {
      cancelled = true
    }
  }, [isSuperadmin, targets])

  if (!isSuperadmin || getImpersonationFromStorage()) return null

  const handleSelect = async (target: ImpersonationTarget) => {
    if (startingId) return
    setStartingId(target.id)
    try {
      const res = await startImpersonation(target.id)
      setImpersonationStorage({
        userId: res.target.id,
        email: res.target.email,
        name: res.target.name,
      })
    } catch {
      setStartingId(null)
      return
    }
    try {
      localStorage.removeItem('vibey-user-role')
    } catch {}
    clearActiveOrgStorage()
    clearOrgSensitiveState()
    onSelect()
    navigateHomeAfterOrgSwitch()
  }

  const normalizedFilter = filter.trim().toLowerCase()
  const visibleTargets = (targets ?? []).filter((t) => {
    if (!normalizedFilter) return true
    return (
      (t.name ?? '').toLowerCase().includes(normalizedFilter) ||
      (t.email ?? '').toLowerCase().includes(normalizedFilter)
    )
  })

  return (
    <div className="border-t border-[var(--color-border)]">
      <div className="px-3 pb-1 pt-2">
        <p className="body-3 text-muted-foreground">Clients</p>
      </div>
      {(targets?.length ?? 0) > FILTER_THRESHOLD && (
        <div className="px-3 pb-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search clients..."
            className="body-3 rounded-spacing-2 w-full border border-[var(--color-border)] bg-transparent px-2 py-1 outline-none"
          />
        </div>
      )}
      <div className="max-h-64 overflow-y-auto pb-1">
        {targets === null ? (
          <p className="body-3 text-muted-foreground px-3 py-2">Loading clients...</p>
        ) : visibleTargets.length === 0 ? (
          <p className="body-3 text-muted-foreground px-3 py-2">No clients found</p>
        ) : (
          visibleTargets.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!!startingId}
              onClick={() => void handleSelect(t)}
              title={t.email ?? undefined}
              className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--color-secondary)] disabled:opacity-60"
            >
              <UserCog className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <span className="body-3 min-w-0 flex-1 truncate text-left">
                {startingId === t.id ? 'Switching...' : (t.name ?? t.email ?? t.id)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
