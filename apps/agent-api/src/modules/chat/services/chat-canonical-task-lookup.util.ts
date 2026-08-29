import type { ArtifactsService } from '../../artifacts/services/artifacts.service'
import { executeArtifactRead } from './chat-artifact-read-execution'
import type { ChatStreamExecutionInput } from './chat-stream-execution.service'
import type { OpenClawCompletionResult, ToolStep } from './openclaw-proxy.service'

export async function runCanonicalTaskLookup(
  input: ChatStreamExecutionInput,
  artifacts: ArtifactsService | undefined,
  title: string,
): Promise<OpenClawCompletionResult> {
  if (!artifacts) {
    return {
      content: '',
      toolSteps: [],
      failed: 'canonical_task_lookup_executor_unavailable',
    }
  }
  const step = await executeArtifactRead(input, artifacts, {
    action: 'list_tasks',
    label: 'Checking the canonical assigned task and its source',
    data: {
      assigned_to_me: true,
      fields: 'summary',
      include_closed: true,
      include_count: true,
      limit: 20,
      search: title,
    },
  })
  return {
    content: formatCanonicalTaskLookup(step, title),
    toolSteps: [step],
    ...(step.status === 'failed' ? { failed: step.error ?? 'list_tasks failed' } : {}),
  }
}

function formatCanonicalTaskLookup(step: ToolStep, requestedTitle: string): string {
  if (step.status === 'failed') {
    return `## Task source\n\n${step.error ?? 'The canonical task lookup failed.'}`
  }
  const tasks = records(record(step.result).tasks)
  const task = tasks.find(
    (candidate) => normalize(text(candidate.title)) === normalize(requestedTitle),
  )
  if (!task) {
    return `## Task source\n\nNo canonical task assigned to you matches **${escapeMarkdown(requestedTitle)}**.`
  }

  const title = text(task.title) || requestedTitle
  const status = text(task.status_label) || text(task.status) || 'open'
  const customData = record(task.custom_data)
  const provenance = record(customData.action_provenance)
  const providerEvidence = record(customData.provider_evidence)
  const sourceKind =
    text(provenance.source_kind) || text(customData.provider) || text(task.source) || 'recorded source'
  const sourceTitle = text(provenance.source_title) || text(customData.source_call)
  const sourceExcerpt = text(provenance.source_excerpt)
  const sourceUrl = safeUrl(
    text(provenance.source_url) || text(providerEvidence.recording_playback_url),
  )
  const timestamp =
    text(provenance.source_timestamp) || text(providerEvidence.recording_timestamp)
  const sourceLabel = sourceTitle || readableSourceKind(sourceKind)
  const linkedSource = sourceUrl
    ? `[${escapeMarkdown(sourceLabel)}](<${sourceUrl}>)`
    : escapeMarkdown(sourceLabel)
  const sourceDetails = [readableSourceKind(sourceKind), timestamp]
    .filter(Boolean)
    .join(' · ')
  const sourceLine =
    sourceTitle || sourceUrl || timestamp || sourceExcerpt
      ? `Source: ${linkedSource}${sourceDetails ? ` — ${sourceDetails}` : ''}.`
      : 'No source provenance is stored on this canonical task yet.'
  const excerptLine = sourceExcerpt ? `\n\n> ${sourceExcerpt.replace(/\n+/g, ' ')}` : ''

  return `## Task source\n\n**${escapeMarkdown(title)}** is assigned to you. Its current status is **${escapeMarkdown(status)}**.\n\n${sourceLine}${excerptLine}`
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : []
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function readableSourceKind(value: string): string {
  if (value === 'fathom') return 'Fathom meeting'
  if (value === 'slack_thread') return 'Slack thread'
  return value.replace(/_/g, ' ')
}

function safeUrl(value: string): string {
  return /^https?:\/\/\S+$/i.test(value) ? value : ''
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|>-])/g, '\\$1')
}
