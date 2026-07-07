import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles, ZodValidationPipe } from '@vibey/api-shared'
import { PlatformEmailDomainDto, PlatformEmailSenderDto } from '../dto/platform-email.dto'
import { AdminService } from '../services/admin.service'

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminPlatformEmailController {
  constructor(private readonly adminService: AdminService) {}

  @Get('platform-email')
  async getPlatformEmail() {
    return this.adminService.getPlatformEmailConfig()
  }

  @Post('platform-email/domain')
  async setPlatformEmailDomain(
    @Body(new ZodValidationPipe(PlatformEmailDomainDto)) body: PlatformEmailDomainDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.setPlatformEmailDomain(user.id, body.domain, body.subdomain)
  }

  @Post('platform-email/verify-domain')
  async verifyPlatformEmailDomain() {
    return this.adminService.verifyPlatformEmailDomain()
  }

  @Post('platform-email/sender')
  async setPlatformEmailSender(
    @Body(new ZodValidationPipe(PlatformEmailSenderDto)) body: PlatformEmailSenderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.setPlatformEmailSender(user.id, body)
  }

  @Post('platform-email/sync-sender')
  async syncPlatformEmailSender() {
    return this.adminService.syncPlatformEmailSender()
  }
}
