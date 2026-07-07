import { getEncoding } from 'js-tiktoken'

export type ContextCategoryId =
  | 'system'
  | 'tools'
  | 'skills'
  | 'brain'
  | 'integrations'
  | 'user_team'
  | 'artifacts_files'
  | 'conversation'
  | 'draft'

export type ContextBreakdownSource = 'run' | 'estimate'

export interface ContextCategoryEntry {
  id: string
  label: string
  tokens: number
}

export interface ContextCategorySlice {
  id: ContextCategoryId
  label: string
  tokens: number
  entries?: ContextCategoryEntry[]
}

export interface ContextBreakdown {
  version: 1
  source: ContextBreakdownSource
  generatedAt: number
  modelId?: string
  contextWindow: number
  totalTokens: number
  slices: ContextCategorySlice[]
}

let encoder: ReturnType<typeof getEncoding> | null = null

function getTokenEncoder(): ReturnType<typeof getEncoding> {
  encoder ??= getEncoding('cl100k_base')
  return encoder
}

export function charsToTokensFast(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0
  return Math.ceil(chars / 4)
}

export function countTextTokens(text: string): number {
  if (!text.trim()) return 0
  try {
    return getTokenEncoder().encode(text).length
  } catch {
    return charsToTokensFast(text.length)
  }
}

export function countJsonTokens(value: unknown): number {
  try {
    return countTextTokens(JSON.stringify(value))
  } catch {
    return 0
  }
}

export function sumContextSlices(slices: ContextCategorySlice[]): number {
  return slices.reduce((sum, slice) => sum + Math.max(0, slice.tokens), 0)
}
