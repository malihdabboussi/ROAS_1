'use client'

import { useEffect, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'

export type UserRole = 'user' | 'power' | 'admin' | 'enterprise'

const RAW_ROLES = ['user', 'power', 'admin', 'enterprise', 'superadmin'] as const
type RawRole = (typeof RAW_ROLES)[number]

interface UserProfile {
  id: string
  role: RawRole
  display_name: string | null
  email: string
}

interface UserRoleState {
  role: UserRole
  loading: boolean
  email: string | null
  /** True for the platform owner account. Superadmin behaves as admin everywhere (`role` reports 'admin'); this flag additionally unlocks client impersonation. */
  isSuperadmin: boolean
}

function normalizeRole(value: unknown): { role: UserRole; isSuperadmin: boolean } {
  const raw = (RAW_ROLES.includes(value as RawRole) ? value : 'user') as RawRole
  if (raw === 'superadmin') return { role: 'admin', isSuperadmin: true }
  return { role: raw, isSuperadmin: false }
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    role: 'user',
    loading: true,
    email: null,
    isSuperadmin: false,
  })

  useEffect(() => {
    // Phase 1: Read cached role from localStorage (instant, before API call returns)
    try {
      const cached = localStorage.getItem('vibey-user-role')
      if (cached) {
        const parsed = JSON.parse(cached)
        const { role, isSuperadmin } = normalizeRole(parsed.role)
        setState({ role, loading: false, email: parsed.email ?? null, isSuperadmin })
      }
    } catch {
      /* empty */
    }

    // Phase 2: Fetch fresh role from API (updates cache)
    let cancelled = false
    async function fetchRole() {
      try {
        const profile = await backendGet<UserProfile>('/api/users/me')
        if (!cancelled) {
          const { role, isSuperadmin } = normalizeRole(profile.role)
          setState({ role, loading: false, email: profile.email ?? null, isSuperadmin })
          try {
            localStorage.setItem(
              'vibey-user-role',
              JSON.stringify({ role: profile.role, email: profile.email ?? null }),
            )
          } catch {
            /* empty */
          }
        }
      } catch {
        if (!cancelled) setState({ role: 'user', loading: false, email: null, isSuperadmin: false })
      }
    }
    void fetchRole()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
