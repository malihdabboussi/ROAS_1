import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { AnthropicClaudeConnectSchema } from '../dto/anthropic-claude.dto'
import { AnthropicClaudeService } from '../services/anthropic-claude.service'

@Controller('integrations/anthropic-claude')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AnthropicClaudeController {
  constructor(private readonly claude: AnthropicClaudeService) {}

  @Get('status')
  async status(@CurrentUser() user: { id: string }) {
    const status = await this.claude.getStatus(user.id)
    return { success: true, ...status }
  }

  @Post('connect')
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = AnthropicClaudeConnectSchema.safeParse(body ?? {})
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const status = await this.claude.connect(user.id, validation.data.setupToken)
    return { success: true, ...status }
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.claude.disconnect(user.id)
    return { success: true }
  }
}
