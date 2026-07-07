import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AnthropicClaudeService } from '../anthropic-claude.service'

const SETUP_TOKEN = `sk-ant-oat01-${'x'.repeat(80)}`

describe('AnthropicClaudeService', () => {
  it('stores setup tokens in vault and writes connection metadata', async () => {
    const vault = {
      storeSecret: vi.fn(async () => {}),
      hasSecret: vi.fn(async () => true),
    }
    const repo = {
      upsertConnection: vi.fn(async () => {}),
      getStatus: vi.fn(async () => ({
        connected: true,
        status: 'connected',
        connectedAt: '2026-06-18T00:00:00.000Z',
      })),
    }
    const service = new AnthropicClaudeService(vault as never, repo as never)

    const result = await service.connect('user-1', ` ${SETUP_TOKEN} `)

    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'anthropic',
      'setup-token:default',
      SETUP_TOKEN,
      'token',
      expect.objectContaining({
        token_type: 'setup_token',
        provider: 'anthropic',
      }),
    )
    expect(repo.upsertConnection).toHaveBeenCalledWith('user-1')
    expect(result.connected).toBe(true)
  })

  it('rejects malformed setup tokens before storing anything', async () => {
    const vault = { storeSecret: vi.fn() }
    const repo = { upsertConnection: vi.fn() }
    const service = new AnthropicClaudeService(vault as never, repo as never)

    await expect(service.connect('user-1', 'sk-ant-api03-not-a-setup-token')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(vault.storeSecret).not.toHaveBeenCalled()
    expect(repo.upsertConnection).not.toHaveBeenCalled()
  })
})
