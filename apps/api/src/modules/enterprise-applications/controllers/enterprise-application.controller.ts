import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, CurrentUser, ZodValidationPipe } from '@vibey/api-shared'
import { EnterpriseApplicationDto } from '../dto/enterprise-application.dto'
import { EnterpriseApplicationService } from '../services/enterprise-application.service'

@Controller('enterprise-applications')
export class EnterpriseApplicationController {
  constructor(private readonly service: EnterpriseApplicationService) {}

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(EnterpriseApplicationDto))
  async apply(@Body() body: EnterpriseApplicationDto, @CurrentUser() user: { id: string }) {
    return this.service.apply(body, user.id, 'app')
  }

  @Post('apply-public')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @UsePipes(new ZodValidationPipe(EnterpriseApplicationDto))
  async applyPublic(@Body() body: EnterpriseApplicationDto) {
    return this.service.apply(body, null, 'website')
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async checkStatus(@Query('email') email: string) {
    if (!email) return { applied: false, status: null }
    return this.service.checkStatus(email)
  }
}
