'use client'

/**
 * List / board / missions: group-by-assignee row title — avatar + name, no glass chip
 * (unassigned is label-only).
 */
export function AssigneeGroupHeaderTitle({
  label,
  avatarUrl,
  isUnassigned,
}: {
  label: string
  /** When set, shows photo; else initial fallback */
  avatarUrl?: string | null
  isUnassigned: boolean
}) {
  if (isUnassigned) {
    return (
      <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
        Unassigned
      </span>
    )
  }
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold text-[var(--foreground)]">
          {(label || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{label}</span>
    </div>
  )
}
