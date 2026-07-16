import { marked } from 'marked'

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtmlToText(value: string): string {
  return decodeBasicEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function looksLikeMarkdown(text: string): boolean {
  return /(?:^|\n)\s{0,3}#{1,6}\s|(?:^|\n)\s*[-*+]\s|(?:^|\n)\s*\d+\.\s|\*\*[^*]+\*\*|__[^_]+__|```/.test(
    text,
  )
}

function unwrapPrefixedMarkdownHtml(text: string): string | null {
  const trimmed = text.trim()
  const preMatch = trimmed.match(/^<pre\b[^>]*>([\s\S]*)<\/pre>$/i)
  if (preMatch) {
    return stripHtmlToText(preMatch[1])
  }
  // Agent dual-write sometimes produced <p># Heading<br>## Sub</p> instead of <h1>/<h2>.
  if (/^<(?:p|div)\b/i.test(trimmed) && looksLikeMarkdown(stripHtmlToText(trimmed))) {
    return stripHtmlToText(trimmed)
  }
  return null
}

/**
 * Space Docs / TipTap expect HTML. Convert markdown when needed.
 * If the string is already real semantic HTML (headings/lists/tables), keep it.
 * If it is markdown dumped into <pre> or <p># ...</p>, unwrap and convert.
 */
export function markdownToHtml(text: string | null | undefined): string | null {
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null

  if (/<(h[1-6]|ul|ol|li|table|blockquote)\b/i.test(trimmed)) {
    return text
  }

  const unwrapped = unwrapPrefixedMarkdownHtml(trimmed)
  if (unwrapped != null) {
    return marked.parse(unwrapped, { async: false, breaks: true }) as string
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) return text
  return marked.parse(trimmed, { async: false, breaks: true }) as string
}
