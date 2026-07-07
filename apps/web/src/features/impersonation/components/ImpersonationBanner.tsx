'use client'

import * as React from 'react'
import { ShieldAlert } from 'lucide-react'
import { clearOrgSensitiveState } from '@/lib/utils/clear-org-state'
import {
  clearImpersonationStorage,
  getImpersonationFromStorage,
  type ImpersonationTargetStorage,
} from '@/lib/utils/impersonation-storage'
import { clearActiveOrgStorage } from '@/lib/utils/org-storage'
import { stopImpersonation } from '../services/impersonation-api'

/**
 * Persistent banner shown while a superadmin impersonation session is active.
 * The session lives in sessionStorage, so it ends with the tab; exiting here
 * also writes the impersonation_stop audit entry.
 */
export function ImpersonationBanner() {
  const [target, setTarget] = React.useState<ImpersonationTargetStorage | null>(null)
  const [exiting, setExiting] = React.useState(false)

  React.useEffect(() => {
    setTarget(getImpersonationFromStorage())
  }, [])

  if (!target) return null

  const label = target.name || target.email || target.userId

  const handleExit = async () => {
    if (exiting) return
    setExiting(true)
    try {
      await stopImpersonation(target.userId)
    } catch {}
    clearImpersonationStorage()
    try {
      localStorage.removeItem('vibey-user-role')
    } catch {}
    clearActiveOrgStorage()
    clearOrgSensitiveState()
    window.location.href = '/home'
  }

  return (
    <div className="fixed left-1/2 top-2 z-[1100] -translate-x-1/2">
      <div className="banner-glass-amber flex items-center gap-3">
        <ShieldAlert className="h-4 w-4 flex-shrink-0" />
        <span className="body-3 truncate">
          Acting as <strong>{label}</strong>
        </span>
        <button
          type="button"
          onClick={() => void handleExit()}
          disabled={exiting}
          className="body-3 cursor-pointer font-medium underline disabled:opacity-60"
        >
          {exiting ? 'Exiting...' : 'Exit'}
        </button>
      </div>
    </div>
  )
}
