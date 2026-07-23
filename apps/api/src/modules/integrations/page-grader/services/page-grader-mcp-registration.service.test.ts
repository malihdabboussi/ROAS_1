import { BadRequestException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { derivePageGraderMcpUrl } from './page-grader-api.helpers'

describe('derivePageGraderMcpUrl', () => {
  it('derives the MCP edge function from the connected API endpoint', () => {
    expect(derivePageGraderMcpUrl('https://example.supabase.co/functions/v1/roas-api/')).toBe(
      'https://example.supabase.co/functions/v1/page-grader-mcp',
    )
  })

  it('does not guess from an unrelated app URL', () => {
    expect(() => derivePageGraderMcpUrl('https://portal.example.com')).toThrow(BadRequestException)
  })
})
