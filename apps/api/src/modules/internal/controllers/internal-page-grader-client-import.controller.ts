import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  PageGraderClientImportService,
  type PageGraderClientImportBody,
} from '../../brain/services/page-grader-client-import.service'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { InternalRepository } from '../repositories/internal.repository'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalPageGraderClientImportController {
  constructor(
    private readonly pageGraderImport: PageGraderClientImportService,
    private readonly repository: InternalRepository,
  ) {}

  /**
   * POST /api/internal/page-grader/client-package
   */
  @Post('page-grader/client-package')
  @HttpCode(HttpStatus.ACCEPTED)
  async importClientPackage(
    @Body()
    body: PageGraderClientImportBody & {
      user_id?: string
      org_id?: string | null
    },
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }
    const supabase = this.repository.createServiceClient()
    return this.pageGraderImport.importPackage(supabase, body.user_id.trim(), body, {
      userId: body.user_id.trim(),
      orgId: body.org_id ?? null,
    } as never)
  }
}
