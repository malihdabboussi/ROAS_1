import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import {
  OpenAICodexCompleteCallbackSchema,
  OpenAICodexConnectSchema,
} from '../dto/openai-codex.dto'
import { OpenAICodexOAuthService } from '../services/openai-codex-oauth.service'

@Controller('integrations/openai-codex')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class OpenAICodexController {
  constructor(private readonly oauth: OpenAICodexOAuthService) {}

  @Get('status')
  async status(@CurrentUser() user: { id: string }) {
    const status = await this.oauth.getStatus(user.id)
    return { success: true, ...status }
  }

  @Post('connect')
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = OpenAICodexConnectSchema.safeParse(body ?? {})
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const authorizeUrl = this.oauth.getAuthorizationUrl(user.id, validation.data.redirectTo)
    return { success: true, authorizeUrl }
  }

  @Post('callback')
  async callback(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = OpenAICodexCompleteCallbackSchema.safeParse(body ?? {})
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.oauth.completeCallback(user.id, validation.data)
    return { success: true, ...result }
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.oauth.disconnect(user.id)
    return { success: true }
  }
}
