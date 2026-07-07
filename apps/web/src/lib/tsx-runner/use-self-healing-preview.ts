'use client'

import { useEffect, useMemo, useState } from 'react'

export type SelfHealingStatus = 'validating' | 'fixing' | 'ready' | 'fallback'

interface UseSelfHealingPreviewParams {
  code: string
  maxAttempts?: number
  shouldFallback: (code: string) => boolean
  fallbackCode: string
  repairCode?: (code: string, error: string, attempt: number) => Promise<string | null>
}

interface UseSelfHealingPreviewResult {
  resolvedCode: string
  status: SelfHealingStatus
  error: string | null
  attempts: number
}

function stripCodeFence(input: string): string {
  const trimmed = input.trim()
  if (!trimmed.startsWith('```')) return input
  return trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '')
}

/** Collapse multiple `import { ... } from 'react'` lines into one (fixes duplicate identifier errors). */
function mergeDuplicateNamedReactImports(source: string): string {
  const lines = source.split('\n')
  const lineRe = /^(\s*)import\s+\{([^}]+)\}\s+from\s+['"]react['"]\s*;?\s*$/
  const indices: number[] = []
  const names = new Set<string>()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const m = line.match(lineRe)
    if (!m || m[2] === undefined) continue
    indices.push(i)
    for (const part of m[2].split(',')) {
      const token = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim()
      if (token) names.add(token)
    }
  }
  if (indices.length <= 1) return source

  const mergedList = [...names].sort()
  const firstIdx = indices[0]
  const firstLine = firstIdx !== undefined ? lines[firstIdx] : undefined
  if (firstLine === undefined) return source
  const indent = firstLine.match(/^(\s*)/)?.[1] ?? ''
  const mergedLine = `${indent}import { ${mergedList.join(', ')} } from 'react'`
  const skip = new Set(indices.slice(1))
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i === firstIdx) {
      out.push(mergedLine)
      continue
    }
    if (skip.has(i)) continue
    out.push(lines[i] ?? '')
  }
  return out.join('\n')
}

function applyLightRepairs(input: string): string {
  let next = mergeDuplicateNamedReactImports(stripCodeFence(input).trim())
  if (!/export\s+default\s+/m.test(next)) {
    const hasNamedComponent =
      /function\s+[A-Z][A-Za-z0-9_]*\s*\(/m.test(next) ||
      /const\s+[A-Z][A-Za-z0-9_]*\s*=/m.test(next)
    if (!hasNamedComponent && /<[^>]+>/.test(next)) {
      next = `export default function PreviewComponent() {\n  return (\n    ${next}\n  )\n}`
    }
  }
  return next
}

/**
 * Lightweight self-healing pass for generated TSX.
 * Tries local normalization first, then optional backend repair callback.
 */
export function useSelfHealingPreview({
  code,
  maxAttempts = 3,
  shouldFallback,
  fallbackCode,
  repairCode,
}: UseSelfHealingPreviewParams): UseSelfHealingPreviewResult {
  const initial = useMemo(() => (code ?? '').trim(), [code])
  const [resolvedCode, setResolvedCode] = useState(initial)
  const [status, setStatus] = useState<SelfHealingStatus>('validating')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!initial) {
        if (!active) return
        setResolvedCode(fallbackCode)
        setStatus('fallback')
        setError('Empty TSX source')
        setAttempts(1)
        return
      }

      let nextCode = initial
      for (let i = 1; i <= maxAttempts; i++) {
        if (!active) return
        setAttempts(i)
        setStatus(i === 1 ? 'validating' : 'fixing')

        const normalized = applyLightRepairs(nextCode)
        if (!shouldFallback(normalized)) {
          setResolvedCode(normalized)
          setStatus('ready')
          setError(null)
          return
        }

        const nextError = `Generated TSX failed validation on attempt ${i}`
        setError(nextError)
        if (repairCode && i < maxAttempts) {
          try {
            const repaired = await repairCode(normalized, nextError, i)
            if (repaired && repaired.trim()) {
              nextCode = repaired
              continue
            }
          } catch {
            // keep local fallback flow
          }
        }
      }

      if (!active) return
      setResolvedCode(fallbackCode)
      setStatus('fallback')
    }

    void run()

    return () => {
      active = false
    }
  }, [fallbackCode, initial, maxAttempts, repairCode, shouldFallback])

  return { resolvedCode, status, error, attempts }
}
