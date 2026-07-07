import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { RoleEmblem } from '../RoleEmblem'
import { PROJECT_MANAGER_ROLE_KEYS, ROLE_TEAM } from './ready-employees-modal.constants'

export interface ReadyEmployeeLibraryListProps {
  variant: 'mobile' | 'desktop'
  loading: boolean
  filteredProfiles: ReadyEmployeeProfile[]
  selectedRoleKey: string | null
  getDisplayName: (profile: ReadyEmployeeProfile) => string
  onSelectRole: (roleKey: string) => void
  isProfileLocked?: (profile: ReadyEmployeeProfile) => boolean
}

export function ReadyEmployeeLibraryList({
  variant,
  loading,
  filteredProfiles,
  selectedRoleKey,
  getDisplayName,
  onSelectRole,
  isProfileLocked = () => false,
}: ReadyEmployeeLibraryListProps) {
  if (variant === 'mobile') {
    return (
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <VibeyLoadingOrb size="sm" text="Loading..." />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProfiles.map((profile) => {
              const team = ROLE_TEAM[profile.role_key]
              const locked = isProfileLocked(profile)
              return (
                <button
                  key={profile.role_key}
                  type="button"
                  onClick={() => onSelectRole(profile.role_key)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-subtle p-3 text-left transition-all hover:bg-hover-subtle"
                >
                  <RoleEmblem roleKey={profile.role_key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="body-2 text-foreground truncate font-semibold">
                      {getDisplayName(profile)}
                    </p>
                    <p className="body-4 text-muted-foreground">{profile.role}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {locked && (
                      <span className="badge-glass badge-glass-sm badge-glass-muted">Locked</span>
                    )}
                    {PROJECT_MANAGER_ROLE_KEYS.has(profile.role_key) && (
                      <span className="badge-glass badge-glass-sm badge-glass-red">Manager</span>
                    )}
                    {team && <span className={`${team.badge}`}>{team.label}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="scrollbar-hide p-spacing-3 flex-1 overflow-y-auto">
      <div className="space-y-spacing-2">
        {filteredProfiles.map((profile) => {
          const active = profile.role_key === selectedRoleKey
          const team = ROLE_TEAM[profile.role_key]
          const isProjectManager = PROJECT_MANAGER_ROLE_KEYS.has(profile.role_key)
          const locked = isProfileLocked(profile)
          return (
            <button
              key={profile.role_key}
              type="button"
              onClick={() => onSelectRole(profile.role_key)}
              className={`rounded-spacing-2 p-spacing-3 relative w-full border text-left transition-all ${
                active
                  ? 'chip-glass-blue border-primary'
                  : 'border-border bg-surface-subtle hover:bg-hover-subtle'
              }`}
            >
              <div className="gap-spacing-1 absolute right-2 top-2 flex items-center">
                {isProjectManager && (
                  <span className="badge-glass badge-glass-sm badge-glass-red">Manager</span>
                )}
                {locked && (
                  <span className="badge-glass badge-glass-sm badge-glass-muted">Locked</span>
                )}
                {team && <span className={`${team.badge}`}>{team.label}</span>}
              </div>
              <div className="gap-spacing-2 flex items-center">
                <RoleEmblem roleKey={profile.role_key} size="sm" />
                <div className="min-w-0 pr-14">
                  <p className="body-2 text-foreground truncate font-semibold">
                    {getDisplayName(profile)}
                  </p>
                  <p className="body-4 text-muted-foreground">{profile.role}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
