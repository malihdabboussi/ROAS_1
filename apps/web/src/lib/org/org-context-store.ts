'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { backendGet } from '@/lib/api/backend-client'
import { ACTIVE_ORG_STORAGE_KEY, activeOrgSessionStorage } from '@/lib/utils/org-storage'

export type OrgRole = 'owner' | 'admin' | 'creator' | 'editor' | 'viewer'
type AccountMode = 'personal' | 'org_only'
export type DefaultAccountMode = 'personal' | 'org'

type ProfileAccountContext = {
  account_mode?: AccountMode | null
  default_account_mode?: DefaultAccountMode | null
  default_org_id?: string | null
}

type FetchMembershipsOptions = {
  preferProfileDefault?: boolean
}

export interface OrgMembership {
  id: string
  role: OrgRole
  status: string
  org_id: string
  organizations: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    account_type: string
    status: string
  }
}

interface OrgState {
  activeOrgId: string | null
  actualRole: OrgRole | null
  myRole: OrgRole | null
  roleOverride: OrgRole | null
  memberships: OrgMembership[]
  isLoaded: boolean
  isOrgOnly: boolean
  defaultAccountMode: DefaultAccountMode
  defaultOrgId: string | null

  setActiveOrg: (orgId: string | null) => void
  setIsOrgOnly: (isOrgOnly: boolean) => void
  setDefaultAccountPreference: (mode: DefaultAccountMode, orgId: string | null) => void
  setRoleOverride: (role: OrgRole | null) => void
  setMemberships: (memberships: OrgMembership[]) => void
  fetchMemberships: (options?: FetchMembershipsOptions) => Promise<void>
  getActiveOrg: () => OrgMembership | null
  isOrgContext: () => boolean
  hasMinRole: (minRole: OrgRole) => boolean
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  creator: 3,
  editor: 2,
  viewer: 1,
}

function getEffectiveRole(actualRole: OrgRole | null, roleOverride: OrgRole | null) {
  return roleOverride ?? actualRole
}

function getProfileDefault(profile: ProfileAccountContext | null): {
  defaultAccountMode: DefaultAccountMode
  defaultOrgId: string | null
} {
  const defaultAccountMode = profile?.default_account_mode === 'org' ? 'org' : 'personal'
  const defaultOrgId =
    defaultAccountMode === 'org' && typeof profile?.default_org_id === 'string'
      ? profile.default_org_id
      : null
  return { defaultAccountMode: defaultOrgId ? defaultAccountMode : 'personal', defaultOrgId }
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      activeOrgId: null,
      actualRole: null,
      myRole: null,
      roleOverride: null,
      memberships: [],
      isLoaded: false,
      isOrgOnly: false,
      defaultAccountMode: 'personal',
      defaultOrgId: null,

      setActiveOrg: (orgId) => {
        const memberships = get().memberships
        const targetOrgId = orgId ?? (get().isOrgOnly ? (memberships[0]?.org_id ?? null) : null)
        const membership = targetOrgId ? memberships.find((m) => m.org_id === targetOrgId) : null
        const actualRole = membership ? (membership.role as OrgRole) : null
        set({
          activeOrgId: targetOrgId,
          actualRole,
          myRole: actualRole,
          roleOverride: null,
        })
      },

      setIsOrgOnly: (isOrgOnly) => set({ isOrgOnly }),

      setDefaultAccountPreference: (mode, orgId) => {
        set({
          defaultAccountMode: mode,
          defaultOrgId: mode === 'org' ? orgId : null,
        })
      },

      setRoleOverride: (role) => {
        const { activeOrgId, actualRole } = get()
        const roleOverride = activeOrgId ? role : null
        set({
          roleOverride,
          myRole: getEffectiveRole(actualRole, roleOverride),
        })
      },

      setMemberships: (memberships) => {
        const { activeOrgId, roleOverride } = get()
        const active = activeOrgId ? memberships.find((m) => m.org_id === activeOrgId) : null
        const actualRole = active ? (active.role as OrgRole) : null
        set({
          memberships,
          isLoaded: true,
          actualRole,
          myRole: getEffectiveRole(actualRole, activeOrgId ? roleOverride : null),
          roleOverride: activeOrgId ? roleOverride : null,
        })
      },

      fetchMemberships: async (options) => {
        try {
          const preferProfileDefault = options?.preferProfileDefault ?? false
          const [profile, res] = await Promise.all([
            backendGet<ProfileAccountContext>('/api/profile', {
              orgId: null,
            }).catch(() => null),
            backendGet<{ success: boolean; memberships: OrgMembership[] }>('/api/org/my', {
              orgId: null,
            }),
          ])
          if (res.success) {
            const isOrgOnly = profile?.account_mode === 'org_only'
            const { defaultAccountMode, defaultOrgId } = getProfileDefault(profile)
            const activeOrgId = get().activeOrgId
            const roleOverride = get().roleOverride
            const defaultMembership = defaultOrgId
              ? res.memberships.find((m) => m.org_id === defaultOrgId)
              : null
            const effectiveDefaultAccountMode = defaultMembership ? defaultAccountMode : 'personal'
            const effectiveDefaultOrgId = defaultMembership?.org_id ?? null
            const activeMembership = activeOrgId
              ? res.memberships.find((m) => m.org_id === activeOrgId)
              : null
            const preferredOrgId = preferProfileDefault
              ? (activeMembership?.org_id ?? effectiveDefaultOrgId)
              : activeOrgId
            const preferredMembership =
              activeMembership ??
              (preferredOrgId ? res.memberships.find((m) => m.org_id === preferredOrgId) : null)
            const applyingProfileDefault = !activeMembership && preferProfileDefault

            if (isOrgOnly && res.memberships.length > 0) {
              const active = preferredMembership ?? activeMembership ?? res.memberships[0]!
              const actualRole = active.role as OrgRole
              set({
                memberships: res.memberships,
                isLoaded: true,
                isOrgOnly,
                defaultAccountMode: effectiveDefaultAccountMode,
                defaultOrgId: effectiveDefaultOrgId,
                activeOrgId: active.org_id,
                actualRole,
                myRole: actualRole,
                roleOverride: null,
              })
            } else if (preferredMembership) {
              const actualRole = preferredMembership.role as OrgRole
              set({
                memberships: res.memberships,
                isLoaded: true,
                isOrgOnly,
                defaultAccountMode: effectiveDefaultAccountMode,
                defaultOrgId: effectiveDefaultOrgId,
                activeOrgId: preferredMembership.org_id,
                actualRole,
                myRole: getEffectiveRole(actualRole, applyingProfileDefault ? null : roleOverride),
                roleOverride: applyingProfileDefault ? null : roleOverride,
              })
            } else {
              // Personal-mode users with no active org choice default to
              // Personal — never auto-select an org. Org context is only
              // entered by explicit user choice (avatar switcher, invite
              // accept, org creation) or the org_only branch above.
              set({
                memberships: res.memberships,
                isLoaded: true,
                isOrgOnly,
                defaultAccountMode: effectiveDefaultAccountMode,
                defaultOrgId: effectiveDefaultOrgId,
                activeOrgId: null,
                actualRole: null,
                myRole: null,
                roleOverride: null,
              })
            }
          }
        } catch {
          set({
            isLoaded: true,
            activeOrgId: null,
            actualRole: null,
            myRole: null,
            roleOverride: null,
          })
        }
      },

      getActiveOrg: () => {
        const { activeOrgId, memberships } = get()
        if (!activeOrgId) return null
        return memberships.find((m) => m.org_id === activeOrgId) ?? null
      },

      isOrgContext: () => get().activeOrgId !== null,

      hasMinRole: (minRole) => {
        const myRole = get().myRole
        if (!myRole) return false
        return ROLE_HIERARCHY[myRole] >= ROLE_HIERARCHY[minRole]
      },
    }),
    {
      name: ACTIVE_ORG_STORAGE_KEY,
      storage: createJSONStorage(() => activeOrgSessionStorage),
      partialize: (state) => ({
        activeOrgId: state.activeOrgId,
        roleOverride: state.roleOverride,
        actualRole: state.actualRole,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<OrgState> | undefined
        const activeOrgId = persisted?.activeOrgId ?? null
        const actualRole = persisted?.actualRole ?? null
        const roleOverride = activeOrgId ? (persisted?.roleOverride ?? null) : null
        return {
          ...currentState,
          activeOrgId,
          actualRole,
          roleOverride,
          myRole: getEffectiveRole(actualRole, roleOverride),
        }
      },
    },
  ),
)

export function useAccountContextGate() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const isLoaded = useOrgStore((s) => s.isLoaded)

  return {
    activeOrgId,
    isAccountContextReady: isLoaded,
    isPersonalAccountContext: isLoaded && !activeOrgId,
    isOrgAccountContext: isLoaded && !!activeOrgId,
  }
}
