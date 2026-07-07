import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Public,
  ZodValidationPipe,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import {
  McpAuthorizeQueryDto,
  McpAuthorizeRequestParamDto,
  McpConsentDto,
  McpIntrospectDto,
  McpRegisterClientDto,
  McpRevokeDto,
  McpTokenDto,
} from '../dto/mcp-oauth.dto'
import { McpOAuthService } from '../services/mcp-oauth.service'

@Controller()
export class McpOAuthController {
  constructor(private readonly oauth: McpOAuthService) {}

  @Public()
  @Get('.well-known/oauth-authorization-server')
  authorizationServerMetadata() {
    return this.oauth.authorizationServerMetadata()
  }

  @Public()
  @Get('.well-known/openid-configuration')
  openidConfiguration() {
    return this.oauth.authorizationServerMetadata()
  }

  @Public()
  @Get('mcp/oauth/authorize')
  @Redirect()
  async authorize(@Query(new ZodValidationPipe(McpAuthorizeQueryDto)) query: McpAuthorizeQueryDto) {
    const url = await this.oauth.startAuthorization(query)
    return { url, statusCode: 302 }
  }

  @Public()
  @Post('mcp/oauth/register')
  @HttpCode(201)
  async register(@Body(new ZodValidationPipe(McpRegisterClientDto)) body: McpRegisterClientDto) {
    return this.oauth.registerClient(body)
  }

  @Get('mcp/oauth/authorize-request/:requestId')
  @UseGuards(AuthGuard)
  async authorizeRequest(
    @Param(new ZodValidationPipe(McpAuthorizeRequestParamDto))
    params: McpAuthorizeRequestParamDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.oauth.getAuthorizationRequest(params.requestId, user.id)
  }

  @Post('mcp/oauth/consent')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @HttpCode(200)
  async consent(
    @Body(new ZodValidationPipe(McpConsentDto)) body: McpConsentDto,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.oauth.approveConsent(body, user, scope.orgId, scope.orgRole)
  }

  @Public()
  @Post('mcp/oauth/deny')
  @HttpCode(200)
  async deny(@Body(new ZodValidationPipe(McpConsentDto)) body: McpConsentDto) {
    return this.oauth.denyConsent(body)
  }

  @Public()
  @Post('mcp/oauth/token')
  @HttpCode(200)
  async token(@Body(new ZodValidationPipe(McpTokenDto)) body: McpTokenDto) {
    return this.oauth.exchangeToken(body)
  }

  @Public()
  @Post('mcp/oauth/introspect')
  @HttpCode(200)
  async introspect(
    @Body(new ZodValidationPipe(McpIntrospectDto)) body: McpIntrospectDto,
    @Headers('x-internal-token') internalToken: string | undefined,
  ) {
    return this.oauth.introspect(body, internalToken)
  }

  @Public()
  @Post('mcp/oauth/revoke')
  @HttpCode(200)
  async revoke(@Body(new ZodValidationPipe(McpRevokeDto)) body: McpRevokeDto) {
    return this.oauth.revoke(body)
  }
}
