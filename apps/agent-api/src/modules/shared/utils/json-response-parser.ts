export function tryParseJsonObject(content: string): Record<string, unknown> | null {
  if (!content || typeof content !== 'string') return null

  const direct = content.trim()
  if (direct.length > 0) {
    try {
      const parsed = JSON.parse(direct) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // continue
    }
  }

  const markdownCleaned = extractJsonFromMarkdown(content)
  try {
    const parsed = JSON.parse(markdownCleaned) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // continue
  }

  const extracted = extractJsonWithBalancedBraces(markdownCleaned)
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // continue
    }
  }

  const deepCleaned = deepCleanJson(markdownCleaned)
  try {
    const parsed = JSON.parse(deepCleaned) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // continue
  }

  const extractedFromRaw = extractJsonWithBalancedBraces(content)
  if (extractedFromRaw) {
    const repaired = deepCleanJson(extractedFromRaw)
    try {
      const parsed = JSON.parse(repaired) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // continue
    }
  }

  return null
}

function extractJsonFromMarkdown(content: string): string {
  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/i
  const match = content.match(codeBlockPattern)
  if (match?.[1]) return match[1].trim()
  return content.trim()
}

function extractJsonWithBalancedBraces(content: string): string | null {
  const objectStart = content.indexOf('{')
  if (objectStart !== -1) {
    const obj = extractBalanced(content, objectStart, '{', '}')
    if (obj) return obj
  }
  const arrayStart = content.indexOf('[')
  if (arrayStart !== -1) {
    const arr = extractBalanced(content, arrayStart, '[', ']')
    if (arr) return arr
  }
  return null
}

function extractBalanced(
  content: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
): string | null {
  let depth = 0
  let endIndex = -1
  for (let i = startIndex; i < content.length; i++) {
    const ch = content[i]
    if (ch === openChar) depth++
    else if (ch === closeChar) {
      depth--
      if (depth === 0) {
        endIndex = i
        break
      }
    }
  }
  if (endIndex === -1) return null
  return content.slice(startIndex, endIndex + 1)
}

function deepCleanJson(content: string): string {
  let cleaned = content
  cleaned = cleaned.replace(/^\uFEFF/, '')
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '')
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
  cleaned = cleaned.replace(/}(\s*){/g, '},\n{')
  cleaned = cleaned.replace(/](\s*)\[/g, '],\n[')
  return cleaned.trim()
}
