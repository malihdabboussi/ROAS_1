import { Injectable } from '@nestjs/common'
import { MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH } from '../../constants/field-limits'

@Injectable()
export class MissionJsonService {
  parseJsonResponse(content: string): Record<string, unknown> {
    const parsed = this.tryParseJsonStrict(content)
    if (parsed) return parsed
    const cleaned = this.extractJsonFromMarkdown(content)
    throw new Error(`Invalid JSON response: ${cleaned.slice(0, 200)}`)
  }

  tryParseJson(content: string): Record<string, unknown> {
    try {
      return this.parseJsonResponse(content)
    } catch {
      return { raw: content }
    }
  }

  tryParseJsonStrict(content: string): Record<string, unknown> | null {
    if (!content || typeof content !== 'string') return null

    const direct = content.trim()
    if (direct.length > 0) {
      try {
        return JSON.parse(direct) as Record<string, unknown>
      } catch {}
    }

    const markdownCleaned = this.extractJsonFromMarkdown(content)
    try {
      return JSON.parse(markdownCleaned) as Record<string, unknown>
    } catch {}

    const extracted = this.extractJsonWithBalancedBraces(markdownCleaned)
    if (extracted) {
      try {
        return JSON.parse(extracted) as Record<string, unknown>
      } catch {}
    }

    const deepCleaned = this.deepCleanJson(markdownCleaned)
    try {
      return JSON.parse(deepCleaned) as Record<string, unknown>
    } catch {}

    const extractedFromRaw = this.extractJsonWithBalancedBraces(content)
    if (extractedFromRaw) {
      const repaired = this.deepCleanJson(extractedFromRaw)
      try {
        return JSON.parse(repaired) as Record<string, unknown>
      } catch {}
    }

    return null
  }

  sanitizePlanForUser(plan: Record<string, unknown>): Record<string, unknown> {
    const sanitizeText = (value: string): string => value

    const walk = (value: unknown): unknown => {
      if (typeof value === 'string') return sanitizeText(value)
      if (Array.isArray(value)) return value.map((entry) => walk(entry))
      if (value && typeof value === 'object') {
        const next: Record<string, unknown> = {}
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
          next[key] = walk(entry)
        }
        return next
      }
      return value
    }

    return walk(plan) as Record<string, unknown>
  }

  validateSubtaskReviewPayload(
    subtasks: Array<Record<string, any>>,
    reviewRows: unknown[],
  ): {
    valid: boolean
    reviews: Array<{ subtaskId: string; approved: boolean; feedback?: string; reassignTo?: string }>
    reason?: string
  } {
    if (!Array.isArray(reviewRows) || reviewRows.length === 0) {
      return { valid: false, reviews: [], reason: 'subtaskReviews is empty or missing' }
    }

    const expectedIds = new Set(subtasks.map((st) => String(st.id)))
    const seen = new Set<string>()
    const normalized: Array<{
      subtaskId: string
      approved: boolean
      feedback?: string
      reassignTo?: string
    }> = []

    for (const row of reviewRows) {
      if (!row || typeof row !== 'object') {
        return { valid: false, reviews: [], reason: 'review row is not an object' }
      }
      const review = row as Record<string, unknown>
      const subtaskId = typeof review.subtaskId === 'string' ? review.subtaskId : ''
      if (!expectedIds.has(subtaskId)) {
        return {
          valid: false,
          reviews: [],
          reason: `unknown subtask id: ${subtaskId || '(empty)'}`,
        }
      }
      if (seen.has(subtaskId)) {
        return { valid: false, reviews: [], reason: `duplicate subtask review: ${subtaskId}` }
      }
      if (typeof review.approved !== 'boolean') {
        return { valid: false, reviews: [], reason: `approved must be boolean for ${subtaskId}` }
      }
      seen.add(subtaskId)
      normalized.push({
        subtaskId,
        approved: review.approved,
        feedback: typeof review.feedback === 'string' ? review.feedback : undefined,
        reassignTo: typeof review.reassignTo === 'string' ? review.reassignTo : undefined,
      })
    }

    if (seen.size !== expectedIds.size) {
      const missing = [...expectedIds].filter((id) => !seen.has(id))
      return {
        valid: false,
        reviews: [],
        reason: `missing subtask reviews: ${missing.join(', ')}`,
      }
    }

    return { valid: true, reviews: normalized }
  }

  validateMissionUpdates(raw: unknown): {
    title?: string
    brief?: string
  } | null {
    if (!raw || typeof raw !== 'object') return null
    const obj = raw as Record<string, unknown>
    const result: { title?: string; brief?: string } = {}
    if (typeof obj.title === 'string' && obj.title.trim().length > 0) {
      result.title = obj.title.trim().slice(0, MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH)
    }
    if (typeof obj.brief === 'string' && obj.brief.trim().length > 0) {
      result.brief = obj.brief.trim().slice(0, MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH)
    }
    return Object.keys(result).length > 0 ? result : null
  }

  validateAddSubtasks(raw: unknown): {
    valid: boolean
    subtasks: Array<{
      id: string
      title: string
      assignTo: string
      dependsOn: string[]
      assertionKeys?: string[]
      intent: Record<string, string>
      scheduledAt?: string | null
      outputContract?: Record<string, unknown>
    }>
    reason?: string
  } {
    if (!Array.isArray(raw) || raw.length === 0) {
      return { valid: false, subtasks: [], reason: 'addSubtasks is empty or not an array' }
    }
    if (raw.length > 5) {
      return { valid: false, subtasks: [], reason: 'too_many_addSubtasks (max 5)' }
    }
    const normalized: Array<{
      id: string
      title: string
      assignTo: string
      dependsOn: string[]
      assertionKeys?: string[]
      intent: Record<string, string>
      scheduledAt?: string | null
      outputContract?: Record<string, unknown>
    }> = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        return { valid: false, subtasks: [], reason: 'addSubtask entry is not an object' }
      }
      const st = item as Record<string, unknown>
      const id = typeof st.id === 'string' ? st.id : ''
      const title = typeof st.title === 'string' ? st.title.trim().slice(0, 500) : ''
      const assignTo = typeof st.assignTo === 'string' ? st.assignTo : ''
      if (!id || !title || !assignTo) {
        return { valid: false, subtasks: [], reason: `addSubtask missing id/title/assignTo` }
      }
      const dependsOn = Array.isArray(st.dependsOn)
        ? (st.dependsOn as unknown[]).filter((d): d is string => typeof d === 'string')
        : []
      const assertionKeys = Array.isArray(st.assertionKeys)
        ? (st.assertionKeys as unknown[]).filter((key): key is string => typeof key === 'string')
        : undefined
      const scheduledAt =
        typeof st.scheduledAt === 'string' || st.scheduledAt === null ? st.scheduledAt : undefined
      const outputContract =
        st.outputContract &&
        typeof st.outputContract === 'object' &&
        !Array.isArray(st.outputContract)
          ? (st.outputContract as Record<string, unknown>)
          : undefined
      const rawIntent =
        st.intent && typeof st.intent === 'object' ? (st.intent as Record<string, unknown>) : {}
      const intent: Record<string, string> = {}
      for (const key of ['why', 'story', 'sensory', 'endState', 'ecology']) {
        intent[key] = typeof rawIntent[key] === 'string' ? (rawIntent[key] as string) : ''
      }
      normalized.push({
        id,
        title,
        assignTo,
        dependsOn,
        ...(assertionKeys ? { assertionKeys } : {}),
        intent,
        ...(scheduledAt !== undefined ? { scheduledAt } : {}),
        ...(outputContract ? { outputContract } : {}),
      })
    }
    return { valid: true, subtasks: normalized }
  }

  private extractJsonFromMarkdown(content: string): string {
    const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/i
    const match = content.match(codeBlockPattern)
    if (match?.[1]) return match[1].trim()
    return content.trim()
  }

  private extractJsonWithBalancedBraces(content: string): string | null {
    const objectStart = content.indexOf('{')
    if (objectStart !== -1) {
      const obj = this.extractBalanced(content, objectStart, '{', '}')
      if (obj) return obj
    }
    const arrayStart = content.indexOf('[')
    if (arrayStart !== -1) {
      const arr = this.extractBalanced(content, arrayStart, '[', ']')
      if (arr) return arr
    }
    return null
  }

  private extractBalanced(
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

  private deepCleanJson(content: string): string {
    let cleaned = content
    cleaned = cleaned.replace(/^\uFEFF/, '')
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '')
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
    cleaned = cleaned.replace(/}(\s*){/g, '},\n{')
    cleaned = cleaned.replace(/](\s*)\[/g, '],\n[')
    return cleaned.trim()
  }
}
