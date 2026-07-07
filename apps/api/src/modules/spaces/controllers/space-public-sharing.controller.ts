import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  OrgContextGuard,
  OrgRoleGuard,
  Public,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  SpaceShareTokenParamSchema,
  type SpaceShareTokenParam,
} from '../dto'
import { SpacePublicShareResolverService } from '../services/space-public-share-resolver.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpacePublicSharingController {
  constructor(private readonly publicShareResolver: SpacePublicShareResolverService) {}

  @Public()
  @Get('shared/item/:token')
  async getSharedItem(
    @Param(new ZodValidationPipe(SpaceShareTokenParamSchema)) params: SpaceShareTokenParam,
  ) {
    const shared = await this.publicShareResolver.resolvePublicSharedItemByToken(params.token)
    if (!shared) throw new NotFoundException('Shared item not found or expired')
    return shared
  }

  @Public()
  @Get('shared/space/:token')
  async getSharedSpace(
    @Param(new ZodValidationPipe(SpaceShareTokenParamSchema)) params: SpaceShareTokenParam,
  ) {
    void params
    throw new NotFoundException('External sharing is paused')
  }
}
