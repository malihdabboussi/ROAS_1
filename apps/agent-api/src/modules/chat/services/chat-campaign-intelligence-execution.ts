import type { ArtifactsService } from '../../artifacts/services/artifacts.service'
import { executeArtifactRead } from './chat-artifact-read-execution'
import { formatCampaignStatus } from './chat-campaign-intelligence.util'
import type { ChatStreamExecutionInput } from './chat-stream-execution.service'
import type { OpenClawCompletionResult } from './openclaw-proxy.service'

export async function runCampaignIntelligenceResearch(
  input: ChatStreamExecutionInput,
  artifacts: ArtifactsService | undefined,
): Promise<OpenClawCompletionResult> {
  if (!artifacts) {
    return {
      content: '',
      toolSteps: [],
      failed: 'campaign_intelligence_executor_unavailable',
    }
  }
  if (!input.campaignId) {
    return {
      content:
        'I need one specific client campaign before I can retrieve live reporting. Select the client campaign, then ask again.',
      toolSteps: [],
      failed: 'campaign_scope_required',
    }
  }

  const brainStep = await executeArtifactRead(input, artifacts, {
    action: 'search_campaign_brain',
    label: 'Resolving and cross-referencing campaign context',
    data: { campaign_name: input.userContent, query: input.userContent, limit: 10 },
  })
  const resolvedCampaignId = readText(asRecord(brainStep.result).campaign_id)
  if (!resolvedCampaignId) {
    return {
      content:
        'I need one specific client campaign before I can retrieve live reporting. Select the client campaign, then ask again.',
      toolSteps: [brainStep],
    }
  }

  const remainingSteps = await Promise.all([
    executeArtifactRead(input, artifacts, {
      action: 'get_campaign_main_dashboard',
      label: 'Retrieving live campaign performance',
      data: { campaign_id: resolvedCampaignId, refresh: true },
    }),
    executeArtifactRead(input, artifacts, {
      action: 'list_tasks',
      label: 'Retrieving open campaign work',
      data: { campaign_id: resolvedCampaignId, include_closed: false, include_count: true },
    }),
  ])
  const toolSteps = [brainStep, ...remainingSteps]
  return {
    content: formatCampaignStatus(toolSteps),
    toolSteps,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}
