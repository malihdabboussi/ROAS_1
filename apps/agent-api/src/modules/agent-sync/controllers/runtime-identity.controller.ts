import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import {
  BindRuntimeIdentityBodySchema,
  ResetRuntimeIdentityBodySchema,
  type BindRuntimeIdentityBody,
  type ResetRuntimeIdentityBody,
} from '../dtos/runtime-identity.dto'
import { RuntimeIdentityGuard } from '../guards/runtime-identity.guard'
import { AgentRuntimeReadinessService } from '../services/agent-runtime-readiness.service'
import { AgentSyncService } from '../services/agent-sync.service'

@Controller('runtime/identity')
@UseGuards(RuntimeIdentityGuard)
export class RuntimeIdentityController {
  constructor(
    private readonly syncService: AgentSyncService,
    private readonly readinessService: AgentRuntimeReadinessService,
  ) {}

  @Post('bind')
  @HttpCode(HttpStatus.OK)
  async bind(
    @Body(new ZodValidationPipe(BindRuntimeIdentityBodySchema))
    body: BindRuntimeIdentityBody,
  ) {
    return this.syncService.bindRuntimeIdentity({
      userId: body.user_id,
      machineId: body.machine_id,
    })
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset(
    @Body(new ZodValidationPipe(ResetRuntimeIdentityBodySchema))
    body: ResetRuntimeIdentityBody,
  ) {
    const result = await this.syncService.resetRuntimeIdentity({ machineId: body.machine_id })
    this.readinessService.resetAll()
    return result
  }
}
