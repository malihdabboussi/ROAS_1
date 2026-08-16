/**
 * Playbook steps are authored as "Task 1 - Verify audit context" and
 * "Gate 1 - Approve optimization actions". Rendered against a numbered list
 * that prefix is said twice, and it costs the width the actual step name
 * needs. Strip it for display only — the stored title is untouched.
 */
export function formatMissionStepTitle(title: string): string {
  const trimmed = title.trim()
  const stripped = trimmed.replace(/^(?:task|gate|step)\s*\d+\s*[-–—:.]\s*/i, '').trim()
  return stripped || trimmed
}

/**
 * Missions are named after the playbook that produced them, so a thread that
 * ran the same playbook four times shows four identical rows. Until missions
 * are named distinctly at creation, the date is what tells them apart.
 */
export function formatMissionRowDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // Time as well as date: runs of the same playbook are often minutes apart,
  // so the day alone leaves several rows looking identical.
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
