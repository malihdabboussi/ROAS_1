import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import {
  OrgOpenRouterReconciliationSchema,
  type OrgOpenRouterReconciliationDto,
} from '../dto/internal-billing-reconciliation.dto'
import { InternalBillingReconciliationService } from '../services/internal-billing-reconciliation.service'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalBillingReconciliationController {
  constructor(private readonly reconciliationService: InternalBillingReconciliationService) {}

  @Post('billing/org-openrouter-reconciliation')
  @HttpCode(HttpStatus.OK)
  async reconcileOrgOpenRouter(
    @Body(new ZodValidationPipe(OrgOpenRouterReconciliationSchema))
    body: OrgOpenRouterReconciliationDto,
  ) {
    return this.reconciliationService.reconcileOrgOpenRouter(body)
  }
}
