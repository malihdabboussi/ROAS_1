/** Normalize Slack epoch seconds or ISO timestamps to `seconds.ffffff`. */
export function normalizeSlackTimestamp(value: string): string {
  const trimmed = value.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return trimmed
  const millis = Date.parse(trimmed)
  if (!Number.isFinite(millis)) throw new Error('Slack timestamp is not valid')
  return `${Math.floor(millis / 1000)}.000000`
}
