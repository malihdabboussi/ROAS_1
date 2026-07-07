import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { EnterpriseSkillBuilderService } from './enterprise-skill-builder.service'

@Controller('admin/enterprise/skill-builder')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class EnterpriseSkillBuilderSessionsController {
  constructor(private readonly enterpriseSkillBuilderService: EnterpriseSkillBuilderService) {}

  @Get('sessions')
  listSessions(@CurrentUser() admin: { id: string }) {
    return this.enterpriseSkillBuilderService.listSessions(admin.id)
  }

  @Post('sessions')
  createSession(
    @CurrentUser() admin: { id: string },
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      target_agent_key: string
    },
  ) {
    return this.enterpriseSkillBuilderService.createSession(admin.id, body)
  }

  @Get('sessions/:sessionId/messages')
  listMessages(@CurrentUser() admin: { id: string }, @Param('sessionId') sessionId: string) {
    return this.enterpriseSkillBuilderService.listMessages(admin.id, sessionId)
  }

  @Post('sessions/:sessionId/chat')
  async chat(
    @CurrentUser() admin: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string; documents?: Array<Record<string, unknown>> },
    @Res() res: Response,
  ) {
    if (!body.content?.trim() && !(body.documents?.length ?? 0)) {
      res.status(400).json({ error: 'content is required' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const abort = new AbortController()
    res.req.on('close', () => abort.abort())

    try {
      await this.enterpriseSkillBuilderService.streamChat(
        admin.id,
        sessionId,
        body.content?.trim() ?? '',
        async (type, data) => {
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        },
        abort.signal,
        body.documents,
      )
      res.write('data: [DONE]\n\n')
      res.end()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed'
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
}
