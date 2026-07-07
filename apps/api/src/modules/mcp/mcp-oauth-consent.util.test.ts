import { describe, expect, it } from 'vitest'
import { MCP_BASE_SCOPE } from '@vibey/agent-policy'
import {
  resolveApprovedMcpScopes,
  resolveEffectiveMcpConsentOrgId,
} from './mcp-oauth-consent.util'

describe('MCP OAuth consent utilities', () => {
  it('keeps legacy approval behavior when selected scopes are omitted', () => {
    const scopes = resolveApprovedMcpScopes(
      { request_id: 'request-1' },
      { scopes: [MCP_BASE_SCOPE, 'read_brain_personal'] },
    )
    expect(scopes).toEqual([MCP_BASE_SCOPE, 'read_brain_personal'])
  })

  it('rejects concrete selected scopes without the MCP base scope', () => {
    expect(() =>
      resolveApprovedMcpScopes(
        { request_id: 'request-1', selected_scopes: ['read_brain_personal'] },
        { scopes: [MCP_BASE_SCOPE] },
      ),
    ).toThrow(`${MCP_BASE_SCOPE} is required when selecting MCP permissions`)
  })

  it('allows base-only requests to select concrete MCP permission scopes', () => {
    const scopes = resolveApprovedMcpScopes(
      { request_id: 'request-1', selected_scopes: [MCP_BASE_SCOPE, 'read_brain_personal'] },
      { scopes: [MCP_BASE_SCOPE] },
    )
    expect(scopes).toEqual([MCP_BASE_SCOPE, 'read_brain_personal'])
  })

  it('allows read-only campaign scopes selected from consent', () => {
    const scopes = resolveApprovedMcpScopes(
      { request_id: 'request-1', selected_scopes: [MCP_BASE_SCOPE, 'read_campaign'] },
      { scopes: [MCP_BASE_SCOPE] },
    )
    expect(scopes).toEqual([MCP_BASE_SCOPE, 'read_campaign'])
  })

  it('rejects scopes that were not requested for non-umbrella requests', () => {
    expect(() =>
      resolveApprovedMcpScopes(
        { request_id: 'request-1', selected_scopes: [MCP_BASE_SCOPE, 'write_user_memory'] },
        { scopes: [MCP_BASE_SCOPE, 'read_brain_personal'] },
      ),
    ).toThrow('Scope was not requested: write_user_memory')
  })

  it('allows selecting an org for an unlocked OAuth request when context matches', () => {
    expect(
      resolveEffectiveMcpConsentOrgId(
        { request_id: 'request-1', selected_org_id: '00000000-0000-4000-8000-000000000001' },
        { org_id: null },
        '00000000-0000-4000-8000-000000000001',
      ),
    ).toBe('00000000-0000-4000-8000-000000000001')
  })

  it('rejects account selection when the org context does not match', () => {
    expect(() =>
      resolveEffectiveMcpConsentOrgId(
        { request_id: 'request-1', selected_org_id: '00000000-0000-4000-8000-000000000001' },
        { org_id: null },
        null,
      ),
    ).toThrow('Selected account does not match current org context')
  })

  it('keeps OAuth requests with an org locked to that org', () => {
    expect(() =>
      resolveEffectiveMcpConsentOrgId(
        { request_id: 'request-1', selected_org_id: null },
        { org_id: '00000000-0000-4000-8000-000000000001' },
        null,
      ),
    ).toThrow('OAuth request org does not match selected account')
  })
})
