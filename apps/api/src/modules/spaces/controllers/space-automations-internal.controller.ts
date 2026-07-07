import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpaceAutomationInternalService } from '../services/space-automation-internal.service'

@Controller('internal/spaces/:id/automations')
export class SpaceAutomationsInternalController {
  constructor(
    private readonly internalService: SpaceAutomationInternalService,
    private readonly configService: ConfigService,
  ) {}

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('id') spaceId: string,
    @Headers('x-internal-token') internalToken: string,
    @Body() body: { run_state_id: string; task_status: 'done' | 'failed' },
  ) {
    const expected =
      this.configService.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN
    if (!expected || internalToken !== expected) {
      throw new ForbiddenException('Invalid internal token')
    }

    if (!body.run_state_id || !body.task_status) {
      throw new BadRequestException('Missing run_state_id or task_status')
    }

    await this.internalService.dispatchResume(spaceId, body.run_state_id, body.task_status)
    return { accepted: true }
  }
}
