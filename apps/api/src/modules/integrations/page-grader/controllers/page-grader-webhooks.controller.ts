import { Controller, Logger, Post, Req, Res } from '@nestjs/common'
import { waitUntil } from '@vercel/functions'
import type { Request, Response } from 'express'
import { PageGraderBrainSyncService } from '../services/page-grader-brain-sync.service'
import { PageGraderSlackIngestService } from '../services/page-grader-slack-ingest.service'

@Controller('integrations/page-grader')
export class PageGraderWebhooksController {
  private readonly logger = new Logger(PageGraderWebhooksController.name)

  constructor(
    private readonly sync: PageGraderBrainSyncService,
    private readonly slackIngest: PageGraderSlackIngestService,
  ) {}

  /** Push from Page Grader after Client Intel refresh. Auth: x-page-grader-signature webhook secret. */
  @Post('webhooks/brain-package')
  async receiveBrainPackageWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const signature = String(
      req.headers['x-page-grader-signature'] || req.headers['x-webhook-signature'] || '',
    ).trim()

    try {
      const { clientId, work } = await this.sync.beginWebhookProcessing(rawBody, signature)
      res.status(202).json({ success: true, status: 'accepted', client_id: clientId })

      const tracked = work.catch((error) =>
        this.logger.warn(
          `Page Grader brain-package processing failed for ${clientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      )
      try {
        waitUntil(tracked)
      } catch (error) {
        this.logger.warn(
          `waitUntil unavailable for Page Grader client ${clientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        void tracked
      }
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

  /** Client-scoped Slack messages from Page Grader's source cache into ROAS Pixel intelligence. */
  @Post('webhooks/slack-messages')
  async receiveSlackMessagesWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const signature = String(
      req.headers['x-page-grader-signature'] || req.headers['x-webhook-signature'] || '',
    ).trim()
    try {
      const result = await this.slackIngest.processWebhook(rawBody, signature)
      res.status(200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader Slack messages webhook failed: ${message}`)
      const status =
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('unknown') ||
        message.toLowerCase().includes('signature')
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
