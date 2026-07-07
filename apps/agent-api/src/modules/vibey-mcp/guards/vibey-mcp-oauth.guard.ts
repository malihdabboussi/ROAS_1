import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { VibeyMcpTokenIntrospectionService } from '../services/vibey-mcp-token-introspection.service'

@Injectable()
export class VibeyMcpOAuthGuard implements CanActivate {
  constructor(private readonly introspection: VibeyMcpTokenIntrospectionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const auth = String(request.headers.authorization ?? '')
    if (!auth.startsWith('Bearer ')) {
      const response = context.switchToHttp().getResponse()
      response.setHeader('WWW-Authenticate', this.authenticateHeader())
      throw new UnauthorizedException('Missing MCP bearer token')
    }
    const token = auth.slice('Bearer '.length).trim()
    request.vibeyMcp = { claims: await this.introspection.introspect(token) }
    return true
  }

  private authenticateHeader(): string {
    const resourceMetadata = this.resourceMetadataUrl()
    return `Bearer resource_metadata="${resourceMetadata}", scope="mcp:tools"`
  }

  private resourceMetadataUrl(): string {
    const resource = process.env.MCP_RESOURCE_URL ?? 'https://mcp.vibey.im'
    const origin = new URL(resource).origin
    return `${origin}/.well-known/oauth-protected-resource`
  }
}
