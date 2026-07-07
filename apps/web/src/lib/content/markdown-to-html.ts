import { marked } from 'marked'

export function markdownToHtml(text: string | null | undefined): string | null {
  if (!text) return null
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return marked.parse(text, { async: false, breaks: true }) as string
}
