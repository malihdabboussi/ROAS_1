import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  ProviderBillingAttemptSchema,
  ProviderBillingReconcileSchema,
  ProviderBillingSettleSchema,
  type ProviderBillingAttemptDto,
  type ProviderBillingReconcileDto,
  type ProviderBillingSettleDto,
} from '../dto/provider-billing.dto'
import { ProviderBillingSettlementService } from '../services/provider-billing-settlement.service'

@Controller('internal/provider-billing')
@UseGuards(InternalAuthGuard)
export class InternalProviderBillingController {
  constructor(private readonly settlementService: ProviderBillingSettlementService) {}

  @Post('attempts')
  @HttpCode(HttpStatus.OK)
  async recordAttempt(
    @Body(new ZodValidationPipe(ProviderBillingAttemptSchema))
    body: ProviderBillingAttemptDto,
  ) {
    const attempt = await this.settlementService.recordAttempt(body)
    return { success: true, attempt }
  }

  @Post('settle')
  @HttpCode(HttpStatus.OK)
  async settle(
    @Body(new ZodValidationPipe(ProviderBillingSettleSchema))
    body: ProviderBillingSettleDto,
  ) {
    const attempt = await this.settlementService.settleByIdOrGeneration(body)
    return { success: Boolean(attempt), attempt }
  }

  @Post('reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcile(
    @Body(new ZodValidationPipe(ProviderBillingReconcileSchema))
    body: ProviderBillingReconcileDto,
  ) {
    return this.settlementService.reconcileDue(body)
  }
}
