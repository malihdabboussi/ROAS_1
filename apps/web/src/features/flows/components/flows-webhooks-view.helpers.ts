import type { FlowWebhookFieldMapping } from '@/lib/flows/webhook-endpoints-api'

export const EMPTY_WEBHOOK_SAMPLE =
  '{\n  "customer": {\n    "email": "customer@example.com"\n  }\n}'

export function parseWebhookSample(
  value: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!value.trim()) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(value) as unknown }
  } catch {
    return { ok: false, error: 'Sample payload must be valid JSON' }
  }
}

export function formatWebhookJson(value: unknown): string {
  if (value === null || value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export function collectWebhookSampleMappings(value: unknown, path = ''): FlowWebhookFieldMapping[] {
  if (!value || typeof value !== 'object') return []
  const rows: FlowWebhookFieldMapping[] = []
  const entries = Array.isArray(value)
    ? value.slice(0, 3).map((entry, index) => [String(index), entry] as const)
    : Object.entries(value as Record<string, unknown>)
  for (const [key, child] of entries) {
    const nextPath = `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      rows.push(...collectWebhookSampleMappings(child, nextPath))
      continue
    }
    const parts = nextPath.split('/').filter(Boolean).slice(-2)
    rows.push({
      key: snakeCase(parts.join('_')),
      label: parts.map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~')).join(' '),
      source_path: nextPath,
      value_type: inferWebhookSampleType(child),
    })
  }
  return rows.slice(0, 12)
}

export function formatWebhookDate(value: string | null | undefined): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function snakeCase(value: string): string {
  const cleaned = value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  return cleaned || 'field'
}

function inferWebhookSampleType(value: unknown): FlowWebhookFieldMapping['value_type'] {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  const type = typeof value
  if (type === 'string' || type === 'number' || type === 'boolean') return type
  if (type === 'object') return 'object'
  return 'unknown'
}
