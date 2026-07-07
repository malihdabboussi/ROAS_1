import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CacheInstagramImagesSchema,
  CacheSocialImagesSchema,
  type CachedSocialImageResult,
  type SocialPlatform,
} from '../dto'
import { MediaService } from '../services/media.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaSocialCacheController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('cache-instagram-images')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async cacheInstagramImages(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const parsed = CacheInstagramImagesSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid request', details: parsed.error.issues })
    }
    return this.runSocialImageCache('instagram', parsed.data.images, user, scope)
  }

  @Post('cache-social-images')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async cacheSocialImages(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const parsed = CacheSocialImagesSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid request', details: parsed.error.issues })
    }
    return this.runSocialImageCache(parsed.data.platform, parsed.data.images, user, scope)
  }

  private async runSocialImageCache(
    platform: SocialPlatform,
    images: ReadonlyArray<{ sourceUrl: string; cacheKey: string; name?: string }>,
    user: { id: string },
    scope: RequestScope,
  ) {
    const results: CachedSocialImageResult[] = []
    const concurrency = 5
    for (let index = 0; index < images.length; index += concurrency) {
      const batch = images.slice(index, index + concurrency)
      const batchResults = await Promise.all(
        batch.map((image) =>
          this.mediaService.cacheSocialImage(
            platform,
            image.sourceUrl,
            image.cacheKey,
            user,
            scope.orgId,
            { name: image.name },
          ),
        ),
      )
      results.push(...batchResults)
    }
    return { success: true, results }
  }
}
