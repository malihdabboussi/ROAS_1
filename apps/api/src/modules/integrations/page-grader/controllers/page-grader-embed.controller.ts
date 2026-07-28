import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
} from '@vibey/api-shared'
import { CreatePageGraderEmbedSessionSchema } from '../dto/page-grader.dto'
import { PageGraderApiService } from '../services/page-grader-api.service'

@Controller('integrations/page-grader')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class PageGraderEmbedController {
  constructor(private readonly api: PageGraderApiService) {}

  @Post('embed-session')
  @RequireOrgRole('viewer')
  async createEmbedSession(
    @CurrentUser() user: { id: string; email?: string },
    @Body() body: unknown,
  ) {
    const validation = CreatePageGraderEmbedSessionSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!user.email) {
      throw new HttpException(
        { success: false, error: 'Your ROAS account has no email address' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.createEmbedSession(user.id, user.email, validation.data)
    return { success: true, ...result }
  }
}
