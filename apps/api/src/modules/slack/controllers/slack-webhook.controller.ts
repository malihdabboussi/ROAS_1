import { Body, Controller, Headers, Logger, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { SlackService } from '../services/slack.service'
import type { SlackEventEnvelope } from '../types/slack.types'

@Controller('webhooks/slack')
export class SlackWebhookController {
  private readonly logger = new Logger(SlackWebhookController.name)

  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  handleEvents(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('x-slack-signature') signature: string | undefined,
    @Headers('x-slack-request-timestamp') timestamp: string | undefined,
    @Body() body: SlackEventEnvelope,
  ) {
    if (body.type === 'url_verification' && body.challenge) {
      res.status(200).json({ challenge: body.challenge })
      return
    }

    const work = this.slackService.beginEventsWebhookProcessing({
      signature,
      timestamp,
      rawBody: req.rawBody,
      body,
    })

    res.status(200).json({ ok: true })

    if (work) {
      work.catch((err) =>
        this.logger.error(
          `Slack event processing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    }
  }
}
