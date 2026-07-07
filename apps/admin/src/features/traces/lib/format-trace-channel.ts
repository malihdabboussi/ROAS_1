const LABELS: Record<string, string> = {
  studio: 'Studio',
  slack: 'Slack',
  telegram: 'Telegram',
  mission: 'Mission',
  'brain-ops': 'Brain Ops',
}

export function formatTraceChannel(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  const key = raw.toLowerCase()
  return LABELS[key] ?? raw.replace(/^./, (c) => c.toUpperCase())
}
