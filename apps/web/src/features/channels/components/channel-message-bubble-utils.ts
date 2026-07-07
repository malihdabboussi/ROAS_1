export const THINKING_PHASES = new Set(['thinking', 'starting', 'retrying'])

export function formatChannelMessageTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function isChannelMessageHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

export function stripChannelMessageHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

export function stripTrailingEmptyParagraphs(html: string): string {
  return html.replace(/(<p>(\s|<br\s*\/?>)*<\/p>\s*)+$/i, '')
}

export function hasVisibleChannelMessageContent(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (isChannelMessageHtml(trimmed)) return stripChannelMessageHtml(trimmed).trim().length > 0
  return true
}

export function getChannelMessageOrbState(
  status: string,
  phase: string | null,
): 'thinking' | 'executing' {
  if (status === 'acknowledged' || !phase || THINKING_PHASES.has(phase)) return 'thinking'
  return 'executing'
}
