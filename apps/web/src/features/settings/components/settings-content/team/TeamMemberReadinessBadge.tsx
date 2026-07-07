import { Check } from 'lucide-react'
import type { TeamRosterEntry } from '@/features/org/services/org.service'

export interface TeamMemberReadinessBadgeProps {
  member: Pick<TeamRosterEntry, 'is_ready' | 'role_label' | 'specialties' | 'accepts_assignments'> & {
    functional_role?: string | null
  }
  compact?: boolean
}

export function computeReadinessMissing(
  member: TeamMemberReadinessBadgeProps['member'],
): string[] {
  const missing: string[] = []
  const role = member.functional_role ?? member.role_label ?? ''
  if (!role.trim()) missing.push('role')
  if (!member.specialties || member.specialties.length === 0) missing.push('specialties')
  if (!member.accepts_assignments) missing.push('opt-in')
  return missing
}

export function TeamMemberReadinessBadge({ member, compact }: TeamMemberReadinessBadgeProps) {
  const missing = computeReadinessMissing(member)
  const ready = missing.length === 0

  if (ready) {
    return (
      <span
        className={`gap-spacing-1 rounded-spacing-1 bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] body-3 inline-flex items-center px-spacing-2 py-spacing-1 font-medium`}
      >
        <Check className="h-3 w-3" />
        Ready for delegation
      </span>
    )
  }

  return (
    <span
      className={`rounded-spacing-1 bg-secondary text-muted-foreground body-3 inline-flex items-center px-spacing-2 py-spacing-1 font-medium`}
      title={`Missing: ${missing.join(', ')}`}
    >
      {compact ? 'Not ready' : `Not ready — add ${missing.join(', ')}`}
    </span>
  )
}
