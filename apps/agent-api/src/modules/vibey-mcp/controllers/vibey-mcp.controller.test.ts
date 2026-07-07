import { MethodNotAllowedException, RequestMethod } from '@nestjs/common'
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { ThrottlerGuard } from '@nestjs/throttler'
import { describe, expect, it } from 'vitest'
import { VibeyMcpOAuthGuard } from '../guards/vibey-mcp-oauth.guard'
import { VibeyMcpController } from './vibey-mcp.controller'

function getRouteMetadata(methodName: keyof VibeyMcpController) {
  const handler = VibeyMcpController.prototype[methodName] as () => unknown

  return {
    paths: Reflect.getMetadata(PATH_METADATA, handler),
    requestMethod: Reflect.getMetadata(METHOD_METADATA, handler),
    guards: Reflect.getMetadata(GUARDS_METADATA, handler),
  }
}

describe('VibeyMcpController', () => {
  it('serves protected-resource metadata on canonical and legacy metadata paths', () => {
    expect(getRouteMetadata('protectedResourceMetadataForEndpoint')).toEqual({
      paths: [
        '.well-known/oauth-protected-resource/api/mcp',
        '.well-known/oauth-protected-resource/api/vibey-mcp',
      ],
      requestMethod: RequestMethod.GET,
      guards: undefined,
    })
  })

  it('protects GET probes on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcpGetProbe')).toEqual({
      paths: ['mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.GET,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
    })
  })

  it('protects HEAD probes on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcpHeadProbe')).toEqual({
      paths: ['', 'mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.HEAD,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
    })
  })

  it('keeps POST JSON-RPC protected on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcp')).toEqual({
      paths: ['', 'mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.POST,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
    })
  })

  it('does not implement GET/HEAD stream transport after authentication', () => {
    const controller = new VibeyMcpController({} as never)

    expect(() => controller.handleMcpGetProbe()).toThrow(MethodNotAllowedException)
    expect(() => controller.handleMcpHeadProbe()).toThrow(MethodNotAllowedException)
  })
})
