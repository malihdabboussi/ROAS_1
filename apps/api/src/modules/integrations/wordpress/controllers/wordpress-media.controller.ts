import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  buildExternalAssetRef,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { WordpressMediaSchema } from '../dto/wordpress.dto'
import { WordpressService } from '../services/wordpress.service'
import { validateWordpressRequest } from './wordpress-controller-validation'

@Controller('integrations/wordpress')
export class WordpressMediaController {
  constructor(private readonly wordpress: WordpressService) {}

  @Post('media')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async uploadMedia(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const input = validateWordpressRequest(WordpressMediaSchema, body)
    const media = await this.wordpress.uploadMedia(scope, input)
    const mediaRecord = media as Record<string, unknown>
    const title = mediaRecord.title as Record<string, unknown> | undefined
    const name =
      typeof title?.rendered === 'string' && title.rendered.trim().length > 0
        ? title.rendered
        : input.title || input.filename || 'WordPress media'
    return {
      success: true,
      media,
      asset_ref: buildExternalAssetRef({
        provider: 'wordpress',
        external_id: mediaRecord.id == null ? null : String(mediaRecord.id),
        file_path: input.filename ?? null,
        url: typeof mediaRecord.source_url === 'string' ? mediaRecord.source_url : null,
        mime_type:
          typeof mediaRecord.mime_type === 'string'
            ? mediaRecord.mime_type
            : input.mime_type ?? 'application/octet-stream',
        asset_type:
          typeof mediaRecord.media_type === 'string' ? mediaRecord.media_type : undefined,
        name,
        original_filename: input.filename ?? name,
        file_size: null,
        org_id: scope.orgId,
        source: 'wordpress',
        source_surface: 'wordpress',
      }),
    }
  }
}
