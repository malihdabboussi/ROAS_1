import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { InternalAuthGuard } from '../../artifacts/guards/internal-auth.guard'
import { AdminSkillBuilderChatService } from '../services/admin-skill-builder-chat.service'

@Controller('internal/admin-skill-builder')
@UseGuards(InternalAuthGuard)
export class AdminSkillBuilderController {
  constructor(private readonly chatService: AdminSkillBuilderChatService) {}

  @Post('chat')
  async chat(
    @Body()
    body: {
      session_id: string
      acting_user_id: string
      org_id?: string | null
      target_agent_key: string
      target_agent_name?: string
      admin_user_id: string
      content: string
      documents?: Array<Record<string, unknown>>
      history: Array<{ role: string; content: string }>
      session_key: string
      system_context?: string
    },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const abort = new AbortController()
    res.req.on('close', () => abort.abort())

    try {
      await this.chatService.streamChat({
        session_id: body.session_id,
        acting_user_id: body.acting_user_id,
        org_id: body.org_id,
        target_agent_key: body.target_agent_key,
        target_agent_name: body.target_agent_name,
        admin_user_id: body.admin_user_id,
        content: body.content,
        documents: body.documents as Parameters<
          AdminSkillBuilderChatService['streamChat']
        >[0]['documents'],
        history: body.history,
        session_key: body.session_key,
        system_context: body.system_context,
        signal: abort.signal,
        send: async (type, data) => {
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        },
      })
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
