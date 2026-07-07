import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { BrainCrossSuggestionsService } from '../services/brain-cross-suggestions.service'

@Controller('brain/cross-suggestions')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class BrainCrossSuggestionsController {
  constructor(private readonly suggestions: BrainCrossSuggestionsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @OrgContext() org: RequestScope,
    @Query('status') status?: string,
  ) {
    void org
    return this.suggestions.list(user.id, status)
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser() user: { id: string },
    @OrgContext() org: RequestScope,
    @Param('id') id: string,
  ) {
    return this.suggestions.accept(user.id, org, id)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.suggestions.reject(user.id, id)
  }
}
