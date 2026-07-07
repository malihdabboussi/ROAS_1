/**
 * CreditsGuard
 *
 * Pre-request guard that checks if the user has credits remaining.
 * - Hard gate: 0 credits → reject with 402 Payment Required
 * - Soft gate: < LOW_CREDITS_THRESHOLD → allow but set header x-credits-low: true
 *
 * Supports both org billing (via orgId on request) and personal/team billing.
 * Apply to any controller/route that consumes credits (chat, image gen, etc.)
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { CreditsService } from '../services/credits.service'

const LOW_CREDITS_THRESHOLD = 100

@Injectable()
export class CreditsGuard implements CanActivate {
  private readonly logger = new Logger(CreditsGuard.name)

  constructor(private readonly creditsService: CreditsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()

    const user = (request as unknown as { user?: { id: string } }).user
    if (!user?.id) {
      return true
    }

    try {
      const requestedModel = (request.body as { model?: unknown } | undefined)?.model
      if (this.creditsService.isSubscriptionBackedModelId(requestedModel)) {
        response.setHeader('x-credits-subscription-bypass', 'true')
        this.logger.debug(`Skipping credit gate for subscription model user ${user.id}`)
        return true
      }

      const orgId = (request as any).orgId as string | undefined
      const balance = await this.creditsService.assertHasAvailableCredits(user.id, orgId)
      const remaining = balance.totalAvailable

      if (remaining < LOW_CREDITS_THRESHOLD) {
        response.setHeader('x-credits-low', 'true')
        response.setHeader('x-credits-remaining', String(remaining))
        this.logger.debug(`Low credits for user ${user.id}: ${remaining} remaining`)
      }

      response.setHeader('x-credits-remaining', String(remaining))

      return true
    } catch (err) {
      if (err instanceof HttpException) throw err

      this.logger.error(`CreditsGuard error for user ${user.id}: ${err}`)
      throw new HttpException('Billing service unavailable', HttpStatus.SERVICE_UNAVAILABLE)
    }
  }
}
