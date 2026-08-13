import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { BillingCreditAlertRepository } from '../repositories/billing-credit-alert.repository'
import { CreditsService } from './credits.service'

const ALERT_THRESHOLDS = [70, 90, 100] as const

export function crossedCreditAlertThresholds(used: number, remaining: number): number[] {
  const total = used + remaining
  if (used <= 0 || total <= 0) return []
  const percent = Math.min(100, Math.floor((used / total) * 100))
  return ALERT_THRESHOLDS.filter((threshold) => percent >= threshold)
}

export function composeCreditAlertMessage(input: {
  used: number
  remaining: number
  appUrl: string
}): string {
  const total = input.used + input.remaining
  const percent = Math.min(100, Math.floor((input.used / total) * 100))
  return `Hey! Just a heads-up — you've used ${percent}% of your monthly credits (${input.used.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}). You can <${input.appUrl}/home|manage your plan> to add more credits. Reply here if you'd like help choosing the right option.`
}

@Injectable()
export class BillingCreditAlertService {
  private readonly logger = new Logger(BillingCreditAlertService.name)

  constructor(
    private readonly repo: BillingCreditAlertRepository,
    private readonly credits: CreditsService,
    private readonly slack: SlackAgentToolsService,
    private readonly config: ConfigService,
  ) {}

  async processDueAlerts(now = new Date()): Promise<{ sent: number }> {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const candidates = await this.repo.listRecentlyUpdatedOrgLedgers(since)
    let sent = 0
    for (const candidate of candidates) {
      try {
        sent += await this.processOrg(candidate.orgId, candidate.periodStart)
      } catch (error) {
        this.logger.error(
          `Credit alert failed for org ${candidate.orgId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    return { sent }
  }

  private async processOrg(orgId: string, periodStart: string): Promise<number> {
    const balance = await this.credits.getOrgBalance(orgId)
    const thresholds = crossedCreditAlertThresholds(balance.totalUsed, balance.totalAvailable)
    if (thresholds.length === 0) return 0
    const owners = await this.repo.listOrgOwners(orgId)
    let sent = 0
    for (const ownerId of owners) {
      const slackUserId = await this.repo.findSlackUserId(orgId, ownerId)
      if (!slackUserId) continue
      for (const threshold of [...thresholds].reverse()) {
        const claimed = await this.repo.claim(orgId, ownerId, periodStart, threshold)
        if (!claimed) break
        try {
          const dm = await this.slack.openDm(this.repo.getClient(), ownerId, orgId, {
            slack_user_id: slackUserId,
          })
          const result = await this.slack.sendMessage(this.repo.getClient(), ownerId, orgId, {
            channel_id: String(dm.channel_id),
            text: composeCreditAlertMessage({
              used: balance.totalUsed,
              remaining: balance.totalAvailable,
              appUrl: (this.config.get<string>('APP_URL') || 'https://app.roas.io').replace(
                /\/$/,
                '',
              ),
            }),
          })
          await this.repo.markSent(
            orgId,
            ownerId,
            periodStart,
            threshold,
            typeof result.ts === 'string' ? result.ts : null,
          )
          await this.repo.markLowerThresholdsSatisfied(
            orgId,
            ownerId,
            periodStart,
            thresholds.filter((candidate) => candidate < threshold),
          )
          sent += 1
          break
        } catch (error) {
          await this.repo.releaseClaim(orgId, ownerId, periodStart, threshold)
          throw error
        }
      }
    }
    return sent
  }
}
