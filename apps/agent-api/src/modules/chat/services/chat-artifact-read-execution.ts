import type { ArtifactsService } from '../../artifacts/services/artifacts.service'
import type { ChatStreamExecutionInput } from './chat-stream-execution.service'
import type { ToolStep } from './openclaw-proxy.service'

export async function executeArtifactRead(
  input: ChatStreamExecutionInput,
  artifacts: ArtifactsService,
  request: { action: string; label: string; data: Record<string, unknown> },
): Promise<ToolStep> {
  const toolCallId = `operational-${request.action}-${input.messageId ?? input.runId ?? 'turn'}`
  await input.progressiveSend('status', { phase: 'executing', message: request.label })
  await input.progressiveSend('tool_start', {
    name: request.action,
    action: request.action,
    label: request.label,
    tool_call_id: toolCallId,
  })
  try {
    const result = await artifacts.executeAction(request.action, request.data, input.sessionKey)
    const record = asRecord(result)
    const failed = record.success === false || typeof record.error_code === 'string'
    const error = failed ? readActionError(record, request.action) : undefined
    await input.progressiveSend('tool_end', {
      name: request.action,
      action: request.action,
      label: request.label,
      tool_call_id: toolCallId,
      status: failed ? 'failed' : 'completed',
      ...(error ? { error } : {}),
    })
    return {
      name: request.action,
      action: request.action,
      label: request.label,
      tool_call_id: toolCallId,
      input: request.data,
      result: record,
      status: failed ? 'failed' : 'completed',
      ...(error ? { error } : {}),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await input.progressiveSend('tool_end', {
      name: request.action,
      action: request.action,
      label: request.label,
      tool_call_id: toolCallId,
      status: 'failed',
      error: message,
    })
    return {
      name: request.action,
      action: request.action,
      label: request.label,
      tool_call_id: toolCallId,
      input: request.data,
      status: 'failed',
      error: message,
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { data: value }
}

function readActionError(record: Record<string, unknown>, action: string): string {
  const explanation = asRecord(record.user_explanation)
  if (typeof explanation.sentence === 'string') return explanation.sentence
  if (typeof record.error === 'string') return record.error
  return `${action} failed`
}
