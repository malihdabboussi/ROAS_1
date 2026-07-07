import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common'
import { CreditsService } from '../../billing/services/credits.service'
import { ChannelServiceGuard } from '../../chat/guards/channel-service.guard'
import { TaskAgentService } from '../services/task-agent.service'

@Controller('task-agent')
@UseGuards(ChannelServiceGuard)
export class TaskAgentController {
  private readonly logger = new Logger(TaskAgentController.name)

  constructor(
    private readonly taskAgentService: TaskAgentService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('invoke')
  @HttpCode(HttpStatus.ACCEPTED)
  async invoke(
    @Body()
    body: {
      item_id: string
      space_id: string
      agent_key: string
      user_id: string
      org_id: string | null
      campaign_id?: string | null
      prompt: string
      activity_id?: string
      conversation_refs?: Array<{ id: string; label?: string }>
      include?: Record<string, boolean>
      extra_notes?: string
      skill_keys?: string[]
      agent_collaboration?: 'allowed' | 'disabled'
      execution_batch_id?: string
      execution_batch_agent_keys?: string[]
    },
  ) {
    const { item_id, space_id, agent_key, user_id } = body
    if (!item_id || !space_id || !agent_key || !user_id) {
      return { error: 'Missing required fields' }
    }

    this.logger.log(`Task agent invoke: agent=${agent_key} item=${item_id} space=${space_id}`)

    await this.creditsService.assertHasAvailableCredits(user_id, body.org_id)

    this.taskAgentService.invoke(body).catch((err) => {
      this.logger.error(`Background task agent invoke failed: ${err}`)
    })

    return { accepted: true }
  }

  @Post('cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  async cancel(
    @Body()
    body: {
      item_id: string
      space_id: string
      user_id: string
      org_id: string | null
    },
  ) {
    const { item_id, space_id, user_id } = body
    if (!item_id || !space_id || !user_id) {
      return { error: 'Missing required fields' }
    }

    this.logger.log(`Task agent cancel: item=${item_id} space=${space_id}`)
    return this.taskAgentService.cancel(body)
  }
}
