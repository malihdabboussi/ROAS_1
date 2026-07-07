import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { SupabaseServiceClient, ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  InternalEnsureMachineBodySchema,
  type InternalEnsureMachineBody,
} from '../dto/internal-ensure-machine.dto'
import { MachinesService } from '../services/machines.service'

@Controller('internal/machines')
@UseGuards(InternalAuthGuard)
export class InternalMachinesController {
  constructor(
    private readonly machinesService: MachinesService,
    private readonly serviceClient: SupabaseServiceClient,
  ) {}

  @Post('ensure-running')
  @HttpCode(HttpStatus.OK)
  async ensureRunning(
    @Body(new ZodValidationPipe(InternalEnsureMachineBodySchema))
    body: InternalEnsureMachineBody,
  ) {
    return this.machinesService.ensureRunning(this.serviceClient.client, body.user_id)
  }
}
