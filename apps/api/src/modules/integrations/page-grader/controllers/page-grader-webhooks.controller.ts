import { Controller, Logger, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { PageGraderBrainSyncService } from '../services/page-grader-brain-sync.service'

@Controller('integrations/page-grader')
export class PageGraderWebhooksController {
  private readonly logger = new Logger(PageGraderWebhooksController.name)

  constructor(private readonly sync: PageGraderBrainSyncService) {}

  /** Push from Page Grader after Client Intel refresh. Auth: x-page-grader-signature webhook secret. */
  @Post('webhooks/brain-package')
  async receiveBrainPackageWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const signature = String(
      req.headers['x-page-grader-signature'] || req.headers['x-webhook-signature'] || '',
    ).trim()

    try {
      const result = await this.sync.processWebhook(rawBody, signature)
      res.status(200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader brain-package webhook failed: ${message}`)
      const status =
        message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('unknown')
          ? 401
          : 400
      res.status(status).json({ success: false, error: message })
    }
  }

  /** Push from Page Grader when a ROAS-created ClickUp task changes status. */
  @Post('webhooks/work-status')
  async receiveWorkStatusWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const signature = String(
      req.headers['x-page-grader-signature'] || req.headers['x-webhook-signature'] || '',
    ).trim()

    try {
      const result = await this.sync.processWorkStatusWebhook(rawBody, signature)
      res.status(200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader work-status webhook failed: ${message}`)
      const status =
        message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('unknown')
          ? 401
          : 400
      res.status(status).json({ success: false, error: message })
    }
  }

  /** Push from Page Grader New Agenda → start ROAS precall + Drive agenda write. */
  @Post('webhooks/meeting-agenda')
  async receiveMeetingAgendaWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const signature = String(
      req.headers['x-page-grader-signature'] || req.headers['x-webhook-signature'] || '',
    ).trim()

    try {
      const result = await this.sync.processMeetingAgendaWebhook(rawBody, signature)
      res.status(200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader meeting-agenda webhook failed: ${message}`)
      const status =
        message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('unknown')
          ? 401
          : 400
      res.status(status).json({ success: false, error: message })
    }
  }
}
