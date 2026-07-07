import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { formatSkillName } from '@/features/team/constants/team.constants'
import { RoleEmblem } from '../RoleEmblem'
import { PROJECT_MANAGER_ROLE_KEYS, ROLE_TEAM } from './ready-employees-modal.constants'

export interface ReadyEmployeeProfileDetailProps {
  profile: ReadyEmployeeProfile
  getDisplayName: (profile: ReadyEmployeeProfile) => string
  hireLoading: boolean
  onHire?: () => void
  showFooterHire?: boolean
  hireDisabled?: boolean
  hireControl?: ReactNode
}

export function ReadyEmployeeProfileDetail({
  profile,
  getDisplayName,
  hireLoading,
  onHire,
  showFooterHire = false,
  hireDisabled,
  hireControl,
}: ReadyEmployeeProfileDetailProps) {
  return (
    <>
      <div className="gap-spacing-3 flex items-start">
        <RoleEmblem roleKey={profile.role_key} size="lg" />
        <div className="min-w-0">
          <div className="mb-spacing-1 gap-spacing-1 flex flex-wrap items-center">
            {PROJECT_MANAGER_ROLE_KEYS.has(profile.role_key) && (
              <span className="badge-glass badge-glass-sm badge-glass-red">Manager</span>
            )}
            {ROLE_TEAM[profile.role_key] && (
              <span className={ROLE_TEAM[profile.role_key]?.badge}>
                {ROLE_TEAM[profile.role_key]?.label}
              </span>
            )}
          </div>
          <h3 className="text-foreground text-xl font-bold uppercase">{getDisplayName(profile)}</h3>
          <p className="body-2 text-muted-foreground">
            {profile.role} · {profile.tagline}
          </p>
          <p className="body-3 text-muted-foreground mt-spacing-1">DISC: {profile.disc_profile}</p>
        </div>
      </div>

      <p className="body-2 text-muted-foreground mt-spacing-4">{profile.description}</p>

      <div className="mt-spacing-4">
        <p className="body-3 text-foreground font-semibold uppercase">Responsibilities</p>
        <ul className="mt-spacing-2 space-y-1">
          {profile.responsibilities.map((r) => (
            <li key={r} className="body-3 text-muted-foreground flex items-start gap-2">
              <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {profile.core_beliefs?.length > 0 && (
        <div className="mt-spacing-4">
          <p className="body-3 text-foreground font-semibold uppercase">Mindset</p>
          <ul className="mt-spacing-2 space-y-spacing-2">
            {profile.core_beliefs.map((belief) => (
              <li key={belief} className="body-3 text-muted-foreground flex items-start gap-2">
                <span className="text-primary/60 mt-0.5 shrink-0 text-xs">&#x2756;</span>
                &ldquo;{belief}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-spacing-4">
        <p className="body-3 text-foreground font-semibold uppercase">Skill Library</p>
        <div className="mt-spacing-2 space-y-spacing-2">
          {profile.skill_profiles.map((skill) => (
            <div
              key={skill.skill_key}
              className="rounded-spacing-2 p-spacing-3 border border-border bg-surface-subtle"
            >
              <p className="body-3 text-foreground font-medium">{formatSkillName(skill.name)}</p>
              <p className="body-4 text-muted-foreground">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>

      {showFooterHire && onHire && (
        <div className="mt-spacing-6 pb-4">
          {hireControl}
          <button
            type="button"
            onClick={() => void onHire()}
            disabled={hireLoading || hireDisabled}
            className="chip-glass-green flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {hireLoading ? 'Hiring...' : `Hire ${getDisplayName(profile)}`}
          </button>
        </div>
      )}
    </>
  )
}
