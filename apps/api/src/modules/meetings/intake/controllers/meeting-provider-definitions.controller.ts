import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { MeetingProviderDefinitionsService } from '../../custom/meeting-provider-definitions.service'

/**
 * Note takers defined from Settings › Integrations › More integrations.
 * Reads serve the Library for every signed-in user; writes and the preview
 * are for platform admins (RoleGuard: `admin` and `superadmin`).
 */
@Controller('integrations/meetings/definitions')
@UseGuards(AuthGuard)
export class MeetingProviderDefinitionsController {
  constructor(private readonly definitions: MeetingProviderDefinitionsService) {}

  @Get()
  async list() {
    const definitions = await this.definitions.list()
    return { success: true, definitions }
  }

  @Get(':slug')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async get(@Param('slug') slug: string) {
    const definition = await this.definitions.getForAdmin(slug)
    return { success: true, definition }
  }

  @Post()
  @UseGuards(RoleGuard)
  @Roles('admin')
  async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const definition = await this.definitions.create(body, user.id)
    return { success: true, definition }
  }

  @Post('preview')
  @UseGuards(RoleGuard)
  @Roles('admin')
  preview(@Body() body: unknown) {
    return { success: true, ...this.definitions.preview(body) }
  }

  @Patch(':slug')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async update(@Param('slug') slug: string, @Body() body: unknown) {
    const definition = await this.definitions.update(slug, body)
    return { success: true, definition }
  }

  @Delete(':slug')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async deactivate(@Param('slug') slug: string) {
    await this.definitions.deactivate(slug)
    return { success: true }
  }
}
