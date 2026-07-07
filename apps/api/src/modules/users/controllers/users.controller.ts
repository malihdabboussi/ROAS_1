import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import type { UserRole } from '@vibey/api-shared'
import { UsersService } from '../services/users.service'

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me — returns current user's profile including role
   */
  @Get('me')
  async getMe(@CurrentUser() user: { id: string; email: string }) {
    const profile = await this.usersService.getProfile(user.id)
    return { ...profile, email: user.email }
  }

  /**
   * PATCH /api/users/:id/role — admin-only, sets user role
   */
  @Patch(':id/role')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async setRole(@Param('id') userId: string, @Body() body: { role: UserRole }) {
    if (!['user', 'power', 'admin'].includes(body.role)) {
      return { error: 'Invalid role. Must be: user, power, or admin' }
    }
    const profile = await this.usersService.setRole(userId, body.role)
    return profile
  }
}
