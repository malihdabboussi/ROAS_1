import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BrainContextService } from '../../brain/services/brain-context.service'
import { CampaignContextService } from '../../chat/services/campaign-context.service'
import { IntegrationContextService } from '../../chat/services/integration-context.service'
import { PulseCompositorService } from '../../chat/services/pulse-compositor.service'
import { McpConfigService } from '../../mcp/services/mcp-config.service'
import { ArtifactMissionContextRepository } from '../repositories/artifact-mission-context.repository'

type OpenClawInputMessage = {
  type: 'message'
  role: 'user' | 'assistant' | 'system' | 'developer' | 'tool'
  content: string | unknown[]
}

/**
 * Mission worker already prepends rich campaign graph/offers context via MissionContextService.
 * We omit buildCampaignSummary here to avoid duplicating that block; theme + brain + pulse + integrations + MCP align with chat parity gaps.
 */
@Injectable()
export class MissionContextEnricherService {
  private readonly logger = new Logger(MissionContextEnricherService.name)

  constructor(
    private readonly integrationContext: IntegrationContextService,
    private readonly brainContext: BrainContextService,
    private readonly campaignContext: CampaignContextService,
    private readonly pulseCompositor: PulseCompositorService,
    private readonly supabaseService: SupabaseServiceClient,
    private readonly mcpConfig: McpConfigService,
    private readonly repository: ArtifactMissionContextRepository = new ArtifactMissionContextRepository(),
  ) {}

  private async buildMcpContext(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const { data: project } = await this.repository.findProjectForMcpContext(supabase, {
      userId,
      orgId,
    })
    const projectId = typeof project?.id === 'string' ? project.id : ''
    if (!projectId) return ''

    const servers = await this.mcpConfig.getEnabledServersForAgent(supabase, projectId, null, true)
    if (servers.length === 0) return ''

    const lines = ['<available_mcp_servers>']
    for (const s of servers) {
      const desc = s.description ? ` — ${s.description}` : ''
      lines.push(`- "${s.name}"${desc}`)
    }
    lines.push(
      'Use list_mcp_tools to discover available tools for a server before calling use_mcp_tool.',
    )
    lines.push('</available_mcp_servers>')
    return lines.join('\n')
  }

  async enrichMissionBody(
    body: Record<string, unknown>,
    userId: string,
    agentKey: string,
    campaignId: string | null,
    orgId?: string | null,
  ): Promise<void> {
    if (!userId) return

    const dbSupabase = this.supabaseService.client

    let themeSummary = ''
    if (campaignId) {
      themeSummary = await this.campaignContext
        .buildThemeSummary(userId, campaignId, orgId)
        .catch((err) => {
          this.logger.warn(`Mission theme context failed: ${err}`)
          return ''
        })
    }

    const userBrainSummary = await this.brainContext
      .buildFullContext(userId, agentKey, undefined, orgId)
      .catch((err) => {
        this.logger.warn(`Mission brain context failed: ${err}`)
        return ''
      })

    const integrationSummary = await this.integrationContext
      .buildIntegrationContext(userId, agentKey, orgId)
      .catch((err) => {
        this.logger.warn(`Mission integration context failed: ${err}`)
        return ''
      })

    const mcpSummary = await this.buildMcpContext(dbSupabase, userId, orgId).catch((err) => {
      this.logger.warn(`Mission MCP context failed: ${err}`)
      return ''
    })

    const pulseSummary = await this.pulseCompositor
      .buildPulse(dbSupabase, {
        userId,
        agentKey,
        resolvedCampaignId: campaignId ?? undefined,
        channel: 'studio',
        orgId,
      })
      .catch(() => '')

    const instructionAppend = [integrationSummary, mcpSummary].filter(Boolean).join('\n')
    if (instructionAppend) {
      const existing = typeof body.instructions === 'string' ? body.instructions : ''
      body.instructions = [existing, instructionAppend].filter((s) => String(s).trim()).join('\n')
    }

    const dynamicContextParts = [themeSummary, userBrainSummary, pulseSummary].filter(Boolean)
    if (dynamicContextParts.length === 0) return

    const contextMessage: OpenClawInputMessage = {
      type: 'message',
      role: 'user',
      content: `[CONTEXT]\n${dynamicContextParts.join('\n\n')}`,
    }
    const ackMessage: OpenClawInputMessage = {
      type: 'message',
      role: 'assistant',
      content: 'Context received.',
    }
    const inputRaw = body.input
    const inputArray: OpenClawInputMessage[] = Array.isArray(inputRaw)
      ? (inputRaw as OpenClawInputMessage[])
      : []
    body.input = [contextMessage, ackMessage, ...inputArray]
  }
}
