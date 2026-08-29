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

  const campaignId = input.campaignId
  const toolSteps = await Promise.all([
    executeArtifactRead(input, artifacts, {
      action: 'get_campaign_main_dashboard',
      label: 'Retrieving live campaign performance',
      data: { campaign_id: campaignId, refresh: true },
    }),
    executeArtifactRead(input, artifacts, {
      action: 'search_campaign_brain',
      label: 'Cross-referencing campaign decisions and context',
      data: { campaign_id: campaignId, query: input.userContent, limit: 10 },
    }),
    executeArtifactRead(input, artifacts, {
      action: 'list_tasks',
      label: 'Retrieving open campaign work',
      data: { campaign_id: campaignId, include_closed: false, include_count: true },
    }),
  ])
  return {
    content: formatCampaignStatus(toolSteps),
    toolSteps,
  }
}
