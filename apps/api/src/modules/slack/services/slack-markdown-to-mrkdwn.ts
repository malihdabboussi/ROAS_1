/**
 * Convert common Markdown formatting to Slack mrkdwn.
 * Slack bold is *text* — Markdown **text** otherwise shows literal stars.
 */

export function markdownToSlackMrkdwn(text: string): string {
  if (!text) return text

  const fences: string[] = []
  let out = text.replace(/```[\s\S]*?```/g, (match) => {
    fences.push(match)
    return `\0FENCE${fences.length - 1}\0`
  })

  const inlines: string[] = []
  out = out.replace(/`[^`\n]+`/g, (match) => {
    inlines.push(match)
    return `\0INLINE${inlines.length - 1}\0`
  })

  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => `<${url}|${String(label).trim() || 'link'}>`,
  )

  // Bold before single-asterisk patterns; non-greedy within one line-ish span.
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
  out = out.replace(/__([^_\n]+)__/g, '*$1*')
  out = out.replace(/~~([^~\n]+)~~/g, '~$1~')

  out = out.replace(/\0INLINE(\d+)\0/g, (_match, index: string) => inlines[Number(index)] ?? '')
  out = out.replace(/\0FENCE(\d+)\0/g, (_match, index: string) => fences[Number(index)] ?? '')
  return out
}
