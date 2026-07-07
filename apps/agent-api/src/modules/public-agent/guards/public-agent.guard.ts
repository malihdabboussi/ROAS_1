import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { PublicAgentRepository } from '../repositories/public-agent.repository'

@Injectable()
export class PublicAgentGuard implements CanActivate {
  constructor(private readonly repository: PublicAgentRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    if (request.method === 'OPTIONS') return true

    const token = request.headers['x-public-agent-token']
    if (!token) {
      throw new UnauthorizedException('Missing public agent token')
    }

    const data = await this.repository.findPublicAgentByToken(token)

    if (!data) {
      throw new UnauthorizedException('Invalid or disabled public agent token')
    }

    if (!data.user_id && !data.org_id) {
      throw new UnauthorizedException('Public agent has no owner scope')
    }

    request.publicAgent = {
      userId: (data.user_id as string | null) ?? null,
      orgId: (data.org_id as string | null) ?? null,
      agentKey: data.agent_key,
      widgetEnabled: !!data.widget_enabled,
      widgetAllowedOrigins: (data.widget_allowed_origins as string[]) ?? [],
      widgetCampaignId: (data.widget_campaign_id as string | null) ?? null,
    }

    return true
  }
}
