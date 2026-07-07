import {
  Body,
  Controller,
  Headers,
  Logger,
  Param,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common'
import type { Response } from 'express'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { ProjectAgentCallService } from '../services/project-agent-call.service'

interface AgentCallBody {
  agent_key: string
  message: string
  context?: Record<string, unknown>
}

@Controller('apps')
@UseInterceptors(SyncReadyInterceptor)
export class ProjectAgentCallController {
  private readonly logger = new Logger(ProjectAgentCallController.name)

  constructor(private readonly agentCallService: ProjectAgentCallService) {}

  @Post(':projectId/agent-call')
  async agentCall(
    @Param('projectId') projectId: string,
    @Headers('x-vibey-session-key') sessionKey: string | undefined,
    @Body() body: AgentCallBody,
    @Res() res: Response,
  ) {
    if (!sessionKey) {
      res.status(401).json({ success: false, error: 'Missing x-vibey-session-key header' })
      return
    }

    const validSession = this.agentCallService.validateSessionKey(projectId, sessionKey)
    if (!validSession) {
      res.status(401).json({ success: false, error: 'Invalid session key' })
      return
    }

    const { agent_key, message, context } = body
    if (!agent_key?.trim()) {
      res.status(400).json({ success: false, error: 'agent_key is required' })
      return
    }
    if (!message?.trim()) {
      res.status(400).json({ success: false, error: 'message is required' })
      return
    }

    try {
      const result = await this.agentCallService.callAgent({
        projectId,
        agentKey: agent_key.trim(),
        message: message.trim(),
        context,
        sessionKey,
      })

      res.json({
        success: true,
        agent_key: agent_key.trim(),
        response: result.content,
        usage: result.usage ?? null,
      })
    } catch (err) {
      this.logger.error(
        `[AgentCall] project=${projectId} agent=${agent_key}: ${err instanceof Error ? err.message : String(err)}`,
      )
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Agent call failed',
      })
    }
  }
}
