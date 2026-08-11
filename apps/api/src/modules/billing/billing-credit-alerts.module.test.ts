import { MODULE_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { BillingCreditAlertsModule } from './billing-credit-alerts.module'
import { BillingModule } from './billing.module'
import { BillingCreditsRepository } from './repositories/billing-credits.repository'

describe('BillingCreditAlertsModule wiring', () => {
  it('imports BillingModule and exposes its repository dependency', () => {
    const alertImports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BillingCreditAlertsModule)
    const billingExports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BillingModule)

    expect(alertImports).toContain(BillingModule)
    expect(billingExports).toContain(BillingCreditsRepository)
  })
})
