export interface SlashItem {
  id: string
  key: string
  name: string
  description: string
  is_enabled?: boolean
  type: 'skill' | 'workflow' | 'playbook'
}

/** If the caret is right after a full `/key` or `/key ` that matches a known slash item, return its start index. */
export function getSlashTokenBackspaceDeleteFrom(
  text: string,
  cursor: number,
  knownKeys: readonly string[],
): number | null {
  const before = text.slice(0, cursor)
  const keys = [...new Set(knownKeys)].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    for (const suffix of [`/${key} `, `/${key}`]) {
      if (before.length < suffix.length || !before.endsWith(suffix)) continue
      const from = before.length - suffix.length
      if (text[from] !== '/') continue
      const prev = from === 0 ? undefined : text[from - 1]
      if (prev !== undefined && !/\s/.test(prev)) continue
      return from
    }
  }
  return null
}
