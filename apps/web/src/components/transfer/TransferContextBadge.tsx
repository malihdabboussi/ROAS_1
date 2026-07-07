import { Building2, User } from 'lucide-react'
import type { OrgMembership } from '@/lib/org'

export function TransferContextBadge({
  orgId,
  memberships,
}: {
  orgId: string | null
  memberships: OrgMembership[]
}) {
  if (!orgId) {
    return (
      <span className="body-3 text-muted-foreground gap-spacing-1 flex items-center">
        <User className="icon-sm" />
        Personal
      </span>
    )
  }

  const membership = memberships.find((candidate) => candidate.org_id === orgId)
  return (
    <span className="body-3 text-muted-foreground gap-spacing-1 flex items-center truncate">
      <Building2 className="icon-sm shrink-0" />
      {membership?.organizations.name || 'Organization'}
    </span>
  )
}
