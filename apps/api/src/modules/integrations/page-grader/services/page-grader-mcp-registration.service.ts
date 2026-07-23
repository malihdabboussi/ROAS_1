import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { McpServersService } from '../../../mcp/services/mcp-servers.service'
import { derivePageGraderMcpUrl } from './page-grader-api.helpers'

@Injectable()
export class PageGraderMcpRegistrationService {
  private readonly logger = new Logger(PageGraderMcpRegistrationService.name)

  constructor(private readonly mcpServers: McpServersService) {}

  async ensure(input: {
    supabase: SupabaseClient
    user: { id: string }
    scope: RequestScope
    baseUrl: string
    apiKey: string
  }) {
    const url = derivePageGraderMcpUrl(input.baseUrl)
    const result = await this.mcpServers.ensureServer(input.supabase, input.user, input.scope, {
      name: 'Page Grader',
      url,
      description:
        'Page Grader client, campaign, fulfillment, meeting, memory, and cached Meta context for ROAS agents.',
      domain: 'shared',
      api_key: input.apiKey,
      agent_enabled: true,
    })
    if (!result.success) {
      const error = 'error' in result ? result.error : 'unknown MCP registration error'
      this.logger.warn(`Page Grader MCP registration failed: ${error}`)
    }
    return { ...result, url }
  }
}
