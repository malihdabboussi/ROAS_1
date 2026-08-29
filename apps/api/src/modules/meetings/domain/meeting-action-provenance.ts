import type { FathomSourceAction, FathomTranscriptTurn } from '../providers/fathom-meeting-source'

const EXCERPT_MAX_LENGTH = 500

export function attachFathomActionEvidence(input: {
  actions: readonly FathomSourceAction[]
  transcript: readonly FathomTranscriptTurn[]
}): FathomSourceAction[] {
  return input.actions.map((action) => {
    const turn = findEvidenceTurn(action, input.transcript)
    if (turn) {
      return {
        ...action,
        evidence: {
          sourceKind: 'meeting_transcript',
          excerpt: `${turn.value.speakerName}: ${turn.value.text}`.slice(0, EXCERPT_MAX_LENGTH),
          speakerName: turn.value.speakerName,
          timestamp: turn.value.timestamp,
          transcriptTurnIndex: turn.index,
        },
      }
    }
    return {
      ...action,
      evidence: {
        sourceKind: 'meeting_summary',
        excerpt: action.sourceText.trim().slice(0, EXCERPT_MAX_LENGTH),
        speakerName: null,
        timestamp: null,
        transcriptTurnIndex: null,
      },
    }
  })
}

export function summarizeActionProvenance(
  actions: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> {
  const bySourceKind: Record<string, number> = {}
  let sourced = 0
  for (const action of actions) {
    const provenance = record(record(action.evidence).action_provenance)
    const sourceKind = text(provenance.source_kind)
    if (!sourceKind) continue
    sourced += 1
    bySourceKind[sourceKind] = (bySourceKind[sourceKind] ?? 0) + 1
  }
  const total = actions.length
  return {
    total_actions: total,
    sourced_actions: sourced,
    missing_source_actions: total - sourced,
    coverage_percent: total === 0 ? 100 : Math.round((sourced / total) * 100),
    by_source_kind: bySourceKind,
  }
}

function findEvidenceTurn(
  action: FathomSourceAction,
  transcript: readonly FathomTranscriptTurn[],
): { value: FathomTranscriptTurn; index: number } | null {
  if (transcript.length === 0) return null
  const actionSeconds = timestampSeconds(action.recordingTimestamp)
  if (actionSeconds !== null) {
    const timed = transcript
      .map((value, index) => ({ value, index, seconds: timestampSeconds(value.timestamp) }))
      .filter((candidate) => candidate.seconds !== null)
      .sort(
        (left, right) =>
          Math.abs((left.seconds as number) - actionSeconds) -
          Math.abs((right.seconds as number) - actionSeconds),
      )[0]
    if (timed) return { value: timed.value, index: timed.index }
  }

  const actionTokens = tokens(action.sourceText)
  let best: { value: FathomTranscriptTurn; index: number; score: number } | null = null
  for (const [index, value] of transcript.entries()) {
    const turnTokens = tokens(value.text)
    const score = [...actionTokens].filter((token) => turnTokens.has(token)).length
    if (score > (best?.score ?? 0)) best = { value, index, score }
  }
  return best && best.score > 0 ? { value: best.value, index: best.index } : null
}

function timestampSeconds(value: string | null): number | null {
  if (!value?.trim()) return null
  const parts = value
    .trim()
    .split(':')
    .map((part) => Number(part))
  if (parts.some((part) => !Number.isFinite(part)) || parts.length > 3) return null
  return parts.reduce((total, part) => total * 60 + part, 0)
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 3) ?? [],
  )
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
