import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { CreditsService } from '../../billing/services/credits.service'
import { ChannelServiceGuard } from '../../chat/guards/channel-service.guard'
import { TaskAgentService, type SuggestTasksPayload } from '../services/task-agent.service'

@Controller('agents')
@UseGuards(ChannelServiceGuard)
export class AgentsAutomationController {
  constructor(
    private readonly taskAgentService: TaskAgentService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('suggest-tasks')
  @HttpCode(HttpStatus.OK)
  async suggestTasks(@Body() body: SuggestTasksPayload) {
    if (!body?.space_id || !body?.owner_user_id || !body?.payload) {
      return { error: 'Missing required fields' }
    }
    await this.creditsService.assertHasAvailableCredits(body.owner_user_id, body.org_id ?? null)
    return this.taskAgentService.suggestTasks({
      ...body,
      org_id: body.org_id ?? null,
    })
  }
}
