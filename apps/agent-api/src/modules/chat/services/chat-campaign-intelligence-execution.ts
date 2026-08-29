import type { ArtifactsService } from '../../artifacts/services/artifacts.service'
import {
  campaignNameLookupQueries,
  isGeneralCampaignName,
  pickUniqueFuzzyCampaign,
} from '../../artifacts/services/campaign-name-match'
import { executeArtifactRead } from './chat-artifact-read-execution'
import { formatCampaignStatus } from './chat-campaign-intelligence.util'
import type { ChatStreamExecutionInput } from './chat-stream-execution.service'
import type { OpenClawCompletionResult, ToolStep } from './openclaw-proxy.service'

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

  let resolvedCampaignId: string
  try {
    resolvedCampaignId = await artifacts.resolveCampaignIdByNameForContext(
      input.userId,
      input.userContent,
      input.orgId,
    )
  } catch {
    return {
      content:
        'I need one specific client campaign before I can retrieve live reporting. Select the client campaign, then ask again.',
      toolSteps: [],
    }
  }

  const spacesStep = await executeArtifactRead(input, artifacts, {
    action: 'list_spaces',
    label: 'Resolving the campaign workspace',
    data: { campaign_id: resolvedCampaignId, limit: 80, scope_override: true },
  })
  const targetSpaceId = resolveTargetSpaceId(input.userContent, spacesStep)
  const evidenceSteps = await Promise.all([
    executeArtifactRead(input, artifacts, {
      action: 'search_campaign_brain',
      label: 'Cross-referencing campaign context',
      data: {
        campaign_id: resolvedCampaignId,
        query: input.userContent,
        limit: 10,
        scope_override: true,
      },
    }),
    executeArtifactRead(input, artifacts, {
      action: 'get_campaign_main_dashboard',
      label: 'Retrieving live campaign performance',
      data: { campaign_id: resolvedCampaignId, refresh: true, scope_override: true },
    }),
    ...(targetSpaceId
      ? [
          executeArtifactRead(input, artifacts, {
            action: 'list_tasks',
            label: 'Retrieving open campaign work',
            data: {
              space_id: targetSpaceId,
              include_closed: false,
              include_count: true,
              scope_override: true,
            },
          }),
        ]
      : []),
  ])
  const toolSteps = [spacesStep, ...evidenceSteps]
  return {
    content: formatCampaignStatus(toolSteps),
    toolSteps,
  }
}

function resolveTargetSpaceId(query: string, step: ToolStep): string | null {
  if (step.status === 'failed') return null
  const result = asRecord(step.result)
  const spaces = Array.isArray(result.spaces) ? result.spaces : []
  const rows = spaces
    .map((space) => {
      const record = asRecord(space)
      return {
        id: typeof record.id === 'string' ? record.id : '',
        name: typeof record.title === 'string' ? record.title : '',
      }
    })
    .filter((space) => space.id && space.name)
  const matched = pickUniqueFuzzyCampaign(campaignNameLookupQueries(query), rows)
  if (matched && matched !== 'ambiguous') return matched.id
  const nonGeneral = rows.filter((space) => !isGeneralCampaignName(space.name))
  return nonGeneral.length === 1 ? nonGeneral[0]!.id : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
