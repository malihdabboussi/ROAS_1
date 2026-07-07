import { Body, Controller, Get, Post, Query, Redirect, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import {
  StartWordpressConnectSchema,
  WordpressApplicationPasswordCallbackSchema,
  WordpressOAuthCallbackSchema,
} from '../dto/wordpress.dto'
import { WordpressService } from '../services/wordpress.service'
import { validateWordpressRequest } from './wordpress-controller-validation'

@Controller('integrations/wordpress')
export class WordpressController {
  constructor(private readonly wordpress: WordpressService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@OrgContext() scope: RequestScope) {
    const result = await this.wordpress.getStatus(scope)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const params = validateWordpressRequest(StartWordpressConnectSchema, body)
    const result = await this.wordpress.startConnect(user.id, scope, params)
    return { success: true, ...result }
  }

  @Get('oauth/callback')
  @Redirect()
  async oauthCallback(@Query() query: Record<string, string | undefined>) {
    const params = validateWordpressRequest(WordpressOAuthCallbackSchema, query)
    const url = await this.wordpress.completeWordpressComCallback(params)
    return { url }
  }

  @Get('application-password/callback')
  @Redirect()
  async applicationPasswordCallback(@Query() query: Record<string, string | undefined>) {
    const params = validateWordpressRequest(WordpressApplicationPasswordCallbackSchema, query)
    const url = await this.wordpress.completeApplicationPasswordCallback(params)
    return { url }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@OrgContext() scope: RequestScope) {
    await this.wordpress.disconnect(scope)
    return { success: true }
  }
}
