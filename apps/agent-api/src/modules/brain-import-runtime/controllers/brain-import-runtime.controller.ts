import { BadRequestException, Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { RuntimeIdentityGuard } from '../../agent-sync/guards/runtime-identity.guard'
import {
  BrainImportRuntimeService,
  type BrainImportRuntimeTerminal,
} from '../services/brain-import-runtime.service'

@Controller('internal/brain/import-jobs')
@UseGuards(RuntimeIdentityGuard)
export class BrainImportRuntimeController {
  constructor(private readonly runtime: BrainImportRuntimeService) {}

  @Post(':jobId/execute')
  @HttpCode(200)
  async executeJob(
    @Param('jobId') jobId: string,
    @Body() body: { jobId?: string },
  ): Promise<BrainImportRuntimeTerminal> {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) throw new BadRequestException({ error: 'jobId is required' })
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({ error: 'Missing brain import runtime payload' })
    }
    if (body.jobId !== normalizedJobId) {
      throw new BadRequestException({ error: 'Job id mismatch' })
    }
    return this.runtime.execute(normalizedJobId)
  }
}
