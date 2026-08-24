import {
  Body,
  Controller,
  Get,
  Head,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { MCP_V1_SCOPES } from '@vibey/agent-policy'
import { VibeyMcpOAuthGuard } from '../guards/vibey-mcp-oauth.guard'
import { VibeyMcpServerService } from '../services/vibey-mcp-server.service'
import type { VibeyMcpRequestContext } from '../types/vibey-mcp.types'
import { resolveMcpResourceUrl } from '../vibey-mcp-platform-defaults'

interface RequestWithMcp extends Request {
  vibeyMcp?: VibeyMcpRequestContext
}

@Controller()
export class VibeyMcpController {
  constructor(private readonly server: VibeyMcpServerService) {}

  @Get('.well-known/oauth-protected-resource')
  protectedResourceMetadata() {
    return this.metadata()
  }

  @Get([
    '.well-known/oauth-protected-resource/api/mcp',
    '.well-known/oauth-protected-resource/api/vibey-mcp',
  ])
  protectedResourceMetadataForEndpoint() {
    return this.metadata()
  }

  @Get(['mcp', 'vibey-mcp'])
  @UseGuards(VibeyMcpOAuthGuard, ThrottlerGuard)
  handleMcpGetProbe() {
    throw new MethodNotAllowedException('Vibey MCP accepts POST JSON-RPC requests')
  }

  @Head(['', 'mcp', 'vibey-mcp'])
  @UseGuards(VibeyMcpOAuthGuard, ThrottlerGuard)
  handleMcpHeadProbe() {
    throw new MethodNotAllowedException('Vibey MCP accepts POST JSON-RPC requests')
  }

  @Post(['', 'mcp', 'vibey-mcp'])
  @UseGuards(VibeyMcpOAuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async handleMcp(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithMcp,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.server.handleRpc(body, request.vibeyMcp!.claims)
    if (result === null) response.status(HttpStatus.ACCEPTED)
    return result
  }

  private metadata() {
    const resource = resolveMcpResourceUrl()
    const issuer = process.env.MCP_OAUTH_ISSUER_URL ?? 'http://localhost:3001'
    return {
      resource,
      authorization_servers: [issuer],
      scopes_supported: MCP_V1_SCOPES,
      bearer_methods_supported: ['header'],
    }
  }
}
