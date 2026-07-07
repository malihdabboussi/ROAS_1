import { normalizeEmDashToHyphen } from './artifact-text-normalization'

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function offerToText(offer: { name?: unknown }): string {
  const offerRecord = offer as Record<string, unknown>
  const lines: string[] = []
  lines.push(`OFFER: ${normalizeEmDashToHyphen(String(offer.name || 'Untitled Offer'))}`)
  lines.push('='.repeat(50))
  lines.push('')

  const sections = [
    { title: 'Product & Market Analysis', dataKey: 'step1_data' },
    { title: 'Power Offer Statement', dataKey: 'step2_data' },
    { title: 'Buyer Persona', dataKey: 'step3_data' },
    { title: 'ICP Analysis', dataKey: 'step4_data' },
    { title: 'Competitive Edge', dataKey: 'step5_data' },
    { title: 'Unique Mechanisms', dataKey: 'step6_data' },
  ]

  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.map((item) => `- ${normalizeEmDashToHyphen(String(item))}`).join('\n')
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested != null && nested !== '')
        .map(([key, nested]) => `#### ${formatKey(key)}\n${formatValue(nested)}`)
        .join('\n\n')
    }
    return normalizeEmDashToHyphen(String(value ?? ''))
  }

  for (const section of sections) {
    const data = offerRecord[section.dataKey]
    if (!data) continue

    lines.push(`## ${section.title}`)
    lines.push('')

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!value) continue
      const label = key.replace(/_/g, ' ').replace(/^step\d+ /, '')
      lines.push(`### ${label}`)
      lines.push(formatValue(value))
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function sequenceToText(sequence: {
  name?: unknown
  sequence_emails?: unknown
}): string {
  const lines: string[] = []
  lines.push(`SEQUENCE: ${String(sequence.name || 'Untitled Sequence')}`)
  lines.push('='.repeat(50))
  lines.push('')

  if (Array.isArray(sequence.sequence_emails)) {
    sequence.sequence_emails.forEach((email, index) => {
      const row = (email ?? {}) as Record<string, unknown>
      lines.push(`## Email ${index + 1}: ${String(row.subject || 'No subject')}`)
      lines.push(`Delay: ${String(row.delay_hours)}h`)
      lines.push('')
      lines.push(String(row.body || ''))
      lines.push('')
      lines.push('-'.repeat(50))
      lines.push('')
    })
  }

  return lines.join('\n')
}

export function presentationToText(presentation: {
  name?: unknown
  slides?: unknown
}): string {
  const lines: string[] = []
  lines.push(`PRESENTATION: ${String(presentation.name || 'Untitled Presentation')}`)
  lines.push('='.repeat(50))
  lines.push('')

  if (Array.isArray(presentation.slides)) {
    presentation.slides.forEach((slide, index) => {
      const row = (slide ?? {}) as Record<string, unknown>
      lines.push(`## Slide ${index + 1}`)
      if (row.title) lines.push(`Title: ${String(row.title)}`)
      if (row.content) lines.push(String(row.content))
      lines.push('')
    })
  }

  return lines.join('\n')
}

export function avatarToText(avatar: {
  name?: string | null
  persona_data?: Record<string, unknown>
}): string {
  const lines: string[] = []
  lines.push(`AVATAR: ${normalizeEmDashToHyphen(avatar.name || 'Untitled Avatar')}`)
  lines.push('='.repeat(50))
  lines.push('')

  const personaData = avatar.persona_data ?? {}
  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.map((item) => `- ${normalizeEmDashToHyphen(String(item))}`).join('\n')
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested != null && nested !== '')
        .map(([key, nested]) => `### ${formatKey(key)}\n${formatValue(nested)}`)
        .join('\n\n')
    }
    return normalizeEmDashToHyphen(String(value ?? ''))
  }

  for (const [key, value] of Object.entries(personaData)) {
    if (value == null || value === '') continue
    lines.push(`## ${formatKey(key)}`)
    lines.push(formatValue(value))
    lines.push('')
  }

  return lines.join('\n')
}
