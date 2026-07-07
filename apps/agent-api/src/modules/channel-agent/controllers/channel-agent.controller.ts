import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common'
import { CreditsService } from '../../billing/services/credits.service'
import { ChannelServiceGuard } from '../../chat/guards/channel-service.guard'
import { ChannelAgentService } from '../services/channel-agent.service'

@Controller('channel-agent')
@UseGuards(ChannelServiceGuard)
export class ChannelAgentController {
  private readonly logger = new Logger(ChannelAgentController.name)

  constructor(
    private readonly channelAgentService: ChannelAgentService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('invoke')
  @HttpCode(HttpStatus.ACCEPTED)
  async invoke(
    @Body()
    body: {
      channel_id: string
      message_id: string
      agent_key: string
      user_id: string
      org_id: string | null
      space_id?: string | null
      campaign_id?: string | null
      scope_kind?: 'campaign' | 'shared_space' | null
    },
  ) {
    const { channel_id, message_id, agent_key, user_id, org_id } = body
    if (!channel_id || !message_id || !agent_key || !user_id) {
      return { error: 'Missing required fields' }
    }

    this.logger.log(
      `Channel agent invoke: agent=${agent_key} msg=${message_id} channel=${channel_id} space=${body.space_id ?? 'null'} campaign=${body.campaign_id ?? 'null'}`,
    )

    await this.creditsService.assertHasAvailableCredits(user_id, org_id)

    this.channelAgentService
      .invoke({
        channel_id,
        message_id,
        agent_key,
        user_id,
        org_id: org_id ?? null,
        space_id: body.space_id ?? null,
        campaign_id: body.campaign_id ?? null,
        scope_kind: body.scope_kind ?? null,
      })
      .catch((err) => {
        this.logger.error(`Background channel agent invoke failed: ${err}`)
      })

    return { accepted: true }
  }

  @Post('invoke-brainstorm')
  @HttpCode(HttpStatus.ACCEPTED)
  async invokeBrainstorm(
    @Body()
    body: {
      channel_id: string
      message_id: string
      parent_message_id: string
      agent_keys: string[]
      user_id: string
      org_id: string | null
      space_id?: string | null
      campaign_id?: string | null
      scope_kind?: 'campaign' | 'shared_space' | null
    },
  ) {
    const { channel_id, message_id, parent_message_id, agent_keys, user_id, org_id } = body
    if (!channel_id || !message_id || !parent_message_id || !agent_keys?.length || !user_id) {
      return { error: 'Missing required fields' }
    }

    this.logger.log(
      `Brainstorm invoke: agents=[${agent_keys.join(',')}] msg=${message_id} channel=${channel_id} space=${body.space_id ?? 'null'} campaign=${body.campaign_id ?? 'null'}`,
    )

    await this.creditsService.assertHasAvailableCredits(user_id, org_id)

    this.channelAgentService
      .invokeBrainstorm({
        channel_id,
        message_id,
        parent_message_id,
        agent_keys,
        user_id,
        org_id: org_id ?? null,
        space_id: body.space_id ?? null,
        campaign_id: body.campaign_id ?? null,
        scope_kind: body.scope_kind ?? null,
      })
      .catch((err) => {
        this.logger.error(`Background brainstorm invoke failed: ${err}`)
      })

    return { accepted: true }
  }
}
