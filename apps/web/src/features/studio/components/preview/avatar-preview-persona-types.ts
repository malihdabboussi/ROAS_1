export type JsonPath = (string | number)[]

export interface CustomField {
  id: string
  label: string
  value: string
}

export function clonePersona(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data ?? {})) as Record<string, unknown>
}

export function setPersonaPath(root: Record<string, unknown>, path: JsonPath, value: unknown): void {
  let node: unknown = root
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (key === undefined) return
    if (typeof key === 'number') {
      if (!Array.isArray(node)) return
      node = (node as unknown[])[key]
    } else {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return
      const obj = node as Record<string, unknown>
      let next = obj[key]
      if (next == null || typeof next !== 'object' || Array.isArray(next)) {
        next = {}
        obj[key] = next as Record<string, unknown>
      }
      node = next
    }
  }
  const last = path[path.length - 1]
  if (last === undefined) return
  if (typeof last === 'number') {
    if (!Array.isArray(node)) return
    ;(node as unknown[])[last] = value
  } else {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    ;(node as Record<string, unknown>)[last] = value
  }
}

export function readCustomFields(pd: Record<string, unknown>): CustomField[] {
  const raw = pd.custom_fields
  if (!Array.isArray(raw)) return []
  const out: CustomField[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const rec = item as Record<string, unknown>
    const id = typeof rec.id === 'string' && rec.id ? rec.id : `cf-${out.length}`
    const label = typeof rec.label === 'string' ? rec.label : ''
    const value = typeof rec.value === 'string' ? rec.value : rec.value == null ? '' : String(rec.value)
    out.push({ id, label, value })
  }
  return out
}

export function newCustomFieldId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cf-${crypto.randomUUID()}`
  }
  return `cf-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}
