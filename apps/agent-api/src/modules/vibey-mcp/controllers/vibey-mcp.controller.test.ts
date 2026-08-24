import { HttpStatus, MethodNotAllowedException, RequestMethod } from '@nestjs/common'
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants'
import { ThrottlerGuard } from '@nestjs/throttler'
import { describe, expect, it, vi } from 'vitest'
import { VibeyMcpOAuthGuard } from '../guards/vibey-mcp-oauth.guard'
import { VibeyMcpController } from './vibey-mcp.controller'

function getRouteMetadata(methodName: keyof VibeyMcpController) {
  const handler = VibeyMcpController.prototype[methodName] as () => unknown

  return {
    paths: Reflect.getMetadata(PATH_METADATA, handler),
    requestMethod: Reflect.getMetadata(METHOD_METADATA, handler),
    guards: Reflect.getMetadata(GUARDS_METADATA, handler),
    httpCode: Reflect.getMetadata(HTTP_CODE_METADATA, handler),
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
      httpCode: undefined,
    })
  })

  it('protects GET probes on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcpGetProbe')).toEqual({
      paths: ['mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.GET,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
      httpCode: undefined,
    })
  })

  it('protects HEAD probes on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcpHeadProbe')).toEqual({
      paths: ['', 'mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.HEAD,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
      httpCode: undefined,
    })
  })

  it('keeps POST JSON-RPC protected on canonical and legacy MCP paths', () => {
    expect(getRouteMetadata('handleMcp')).toEqual({
      paths: ['', 'mcp', 'vibey-mcp'],
      requestMethod: RequestMethod.POST,
      guards: [VibeyMcpOAuthGuard, ThrottlerGuard],
      httpCode: HttpStatus.OK,
    })
  })

  it('returns 202 with no JSON-RPC body for accepted notifications', async () => {
    const server = { handleRpc: vi.fn(async () => null) }
    const response = { status: vi.fn() }
    const controller = new VibeyMcpController(server as never)

    await expect(
      controller.handleMcp(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { vibeyMcp: { claims: {} } } as never,
        response as never,
      ),
    ).resolves.toBeNull()
    expect(response.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED)
  })

  it('does not implement GET/HEAD stream transport after authentication', () => {
    const controller = new VibeyMcpController({} as never)

    expect(() => controller.handleMcpGetProbe()).toThrow(MethodNotAllowedException)
    expect(() => controller.handleMcpHeadProbe()).toThrow(MethodNotAllowedException)
  })
})
