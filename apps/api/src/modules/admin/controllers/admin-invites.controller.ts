import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { AdminService } from '../services/admin.service'

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminInvitesController {
  constructor(private readonly adminService: AdminService) {}

  @Get('waitlist')
  async getWaitlist() {
    return this.adminService.getWaitlist()
  }

  @Post('waitlist/:id/invite')
  async sendWaitlistInvite(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.adminService.sendWaitlistInvite(id, user.id)
  }

  @Get('invite-codes')
  async listInviteCodes() {
    return this.adminService.listInviteCodes()
  }

  @Post('invite-codes')
  async createInviteCode(
    @Body() body: { label?: string; maxUses?: number; expiresInDays?: number },
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.createInviteCode(user.id, body)
  }

  @Patch('invite-codes/:id/revoke')
  async revokeInviteCode(@Param('id') id: string) {
    return this.adminService.revokeInviteCode(id)
  }

  @Delete('invite-codes/:id')
  async deleteInviteCode(@Param('id') id: string) {
    return this.adminService.deleteInviteCode(id)
  }
}
