import { beforeEach, describe, expect, it } from 'vitest'
import { ResponseFilterService } from '../response-filter.service'

describe('ResponseFilterService', () => {
  let service: ResponseFilterService

  beforeEach(() => {
    service = new ResponseFilterService()
  })

  describe('filterChunk', () => {
    it('should pass through clean content unchanged', () => {
      const content = 'Here is your marketing campaign strategy.'
      expect(service.filterChunk(content)).toBe(content)
    })

    it('should redact file paths', () => {
      expect(service.filterChunk('Check /root/some/path for details')).not.toContain('/root/')
      expect(service.filterChunk('See /home/user/file.txt')).not.toContain('/home/')
    })

    it('should redact loopback IPs but not localhost hostnames', () => {
      expect(service.filterChunk('API at localhost:3200')).toContain('localhost:3200')
      expect(service.filterChunk('Check 127.0.0.1:8080')).not.toContain('127.0.0.1:8080')
    })

    it('should redact internal service names', () => {
      const result = service.filterChunk('Using OpenClaw and NestJS with PM2')
      expect(result).not.toContain('OpenClaw')
      expect(result).not.toContain('NestJS')
      expect(result).not.toContain('PM2')
    })

    it('should redact API tokens and secrets', () => {
      expect(service.filterChunk('Token: sk-or-abc123def456')).not.toContain('sk-or-')
      expect(service.filterChunk('OpenAI key: sk-proj-aB2cD3eF4gH5iJ6kL7')).not.toContain(
        'sk-proj-',
      )
      expect(service.filterChunk('Key: nxapi-test-abc123')).not.toContain('nxapi-')
      expect(service.filterChunk('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).not.toContain(
        'Bearer eyJ',
      )
    })

    it('redacts secret assignments while keeping env names understandable', () => {
      const result = service.filterChunk('Set OPENAI_API_KEY=sk-proj-aB2cD3eF4gH5iJ6kL7')
      expect(result).toContain('OPENAI_API_KEY=[REDACTED_SECRET]')
      expect(result).not.toContain('sk-proj-')
    })

    it('should redact UUIDs', () => {
      expect(service.filterChunk('ID: 550e8400-e29b-41d4-a716-446655440000')).not.toContain(
        '550e8400',
      )
    })

    it('should keep UUIDs inside URL path segments (signed storage URLs)', () => {
      const url =
        'https://abc.supabase.co/storage/v1/object/sign/bucket/550e8400-e29b-41d4-a716-446655440000/file.png'
      expect(service.filterChunk(url)).toContain('550e8400-e29b-41d4-a716-446655440000')
    })

    it('should redact internal tool names', () => {
      expect(service.filterChunk('I used brain_crystallize to process')).not.toContain(
        'brain_crystallize',
      )
      expect(service.filterChunk('Calling sessions_spawn now')).not.toContain('sessions_spawn')
    })

    it('should rewrite the Social Analysis internal provider name', () => {
      const result = service.filterChunk('I used scrapecreators for this research')
      expect(result).toBe('I used Social Analysis for this research')
    })

    it('should redact agent file references', () => {
      expect(service.filterChunk('Reading SOUL.md for context')).not.toContain('SOUL.md')
      expect(service.filterChunk('Check AGENTS.md')).not.toContain('AGENTS.md')
    })

    it('should redact gateway URL', () => {
      expect(service.filterChunk('Calling gateway.govibey.com/api')).not.toContain(
        'gateway.govibey.com',
      )
    })

    it('should not strip supabase from signed storage hostnames', () => {
      const url = 'https://abc.supabase.co/storage/v1/object/sign/bucket/file.png?sig=test'
      expect(service.filterChunk(url)).toContain('supabase.co')
    })

    it('should clean up double spaces after redaction', () => {
      const result = service.filterChunk('before /root/path/here after')
      expect(result).not.toMatch(/  +/)
    })
  })

  describe('filterComplete', () => {
    it('should work the same as filterChunk', () => {
      const content = 'Using OpenClaw on localhost:3200'
      expect(service.filterComplete(content)).toBe(service.filterChunk(content))
    })

    it('rewrites direct requests for user secrets', () => {
      expect(service.filterComplete('Please provide your OpenAI API key so I can continue')).toBe(
        "I can't take API keys, tokens, or secrets in chat. I'll use the available Vibey tools and connected integrations instead.",
      )
    })
  })
})
