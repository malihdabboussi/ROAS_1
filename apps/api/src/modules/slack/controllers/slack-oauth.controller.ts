import { Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { SlackService } from '../services/slack.service'

@Controller('slack/oauth')
export class SlackOAuthController {
  constructor(private readonly slackService: SlackService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !state) throw new Error('Missing Slack OAuth code/state')
    const result = await this.slackService.handleOAuthCallback(code, state)
    if (result.redirectUrl) {
      return res.redirect(302, result.redirectUrl)
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(result.html)
  }
}
