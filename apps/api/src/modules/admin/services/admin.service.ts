import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PostgresDirectService } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { StripeService } from '../../billing/services/stripe.service'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import { AdminRepository } from '../repositories/admin.repository'
import { AdminBillingHealthBase } from './admin-service-billing-health.base'

@Injectable()
export class AdminService extends AdminBillingHealthBase {
  constructor(
    configService: ConfigService,
    sendgrid: SendGridIntegration,
    repository: AdminRepository,
    postgresDirect: PostgresDirectService,
    creditsService: CreditsService,
    stripeService: StripeService,
  ) {
    super(configService, sendgrid, repository, postgresDirect, creditsService, stripeService)
  }
}
