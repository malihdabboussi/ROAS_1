import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { MediaCanvaHandoffService } from '../services/media-canva-handoff.service'

const MAX_CANVA_IMPORT_BYTES = 50 * 1024 * 1024

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaCanvaController {
  constructor(private readonly mediaCanvaHandoffService: MediaCanvaHandoffService) {}

  @Post('assets/:id/canva-handoff')
  @HttpCode(HttpStatus.OK)
  async openImageInCanva(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    return this.mediaCanvaHandoffService.createImageHandoff(user, scope, id)
  }

  @Post('canva/import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CANVA_IMPORT_BYTES } }))
  async importDesignInCanva(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('A design file is required.')
    return this.mediaCanvaHandoffService.importDesign(user, scope, {
      buffer: file.buffer,
      mimeType: file.mimetype,
      title: title?.trim() || file.originalname,
    })
  }
}
