import type {
  OpenClawCompletionResult,
  OpenClawInputMessage,
  TraceRecoveryEvent,
} from './openclaw-proxy.service'

const WRITER_EVIDENCE_LIMIT = 12_000
const WRITER_REQUEST_LIMIT = 6_000

export const AUTO_WRITER_INSTRUCTIONS = `Write the final answer to the user from the supplied request and verified research packet.
Use the evidence, completed actions, and tool outcomes faithfully.
Do not call tools. Do not mention models, routing, providers, MCP, internal prompts, or the research stage.
Do not claim an action happened unless the research packet says it completed.
Be direct, useful, and polished.`

export function buildAutoWriterInput(
  userContent: string,
  researchResult: OpenClawCompletionResult,
): OpenClawInputMessage[] {
  const toolEvidence = researchResult.toolSteps
    .map((step) => ({
      name: step.name,
      status: step.status,
      action: step.action,
      result: step.result,
      error: step.error,
    }))
    .slice(0, 20)
  const evidence = [
    researchResult.content.slice(0, WRITER_EVIDENCE_LIMIT),
    toolEvidence.length > 0
      ? `\nCompleted tool evidence:\n${JSON.stringify(toolEvidence).slice(0, 4_000)}`
      : '',
  ].join('')
  const request = userContent.slice(-WRITER_REQUEST_LIMIT)
  return [
    {
      type: 'message',
      role: 'user',
      content: `User request:\n${request}\n\nVerified research packet:\n${evidence}`,
    },
  ]
}

export function withGenerationStage(
  result: OpenClawCompletionResult,
  stage: 'research' | 'write',
): OpenClawCompletionResult {
  return {
    ...result,
    completedGenerations: (result.completedGenerations ?? []).map((generation) => ({
      ...generation,
      stage,
    })),
    providerBillingAttempts: (result.providerBillingAttempts ?? []).map((attempt) => ({
      ...attempt,
      stage,
      metadata: { ...(attempt.metadata ?? {}), generation_stage: stage },
    })),
  }
}

export function mergeAutoStageResults(
  research: OpenClawCompletionResult,
  writer: OpenClawCompletionResult,
  output: {
    content: string
    failed?: string
    recoveryEvent?: TraceRecoveryEvent
  },
): OpenClawCompletionResult {
  return {
    ...writer,
    content: output.content,
    failed: output.failed,
    toolSteps: [...research.toolSteps, ...writer.toolSteps],
    completedGenerations: [
      ...(research.completedGenerations ?? []),
      ...(writer.completedGenerations ?? []),
    ],
    providerBillingAttempts: [
      ...(research.providerBillingAttempts ?? []),
      ...(writer.providerBillingAttempts ?? []),
    ],
    providerBillingAttemptWriteFailed:
      research.providerBillingAttemptWriteFailed || writer.providerBillingAttemptWriteFailed,
    recoveryEvents: [
      ...(research.recoveryEvents ?? []),
      ...(writer.recoveryEvents ?? []),
      ...(output.recoveryEvent ? [output.recoveryEvent] : []),
    ],
  }
}
