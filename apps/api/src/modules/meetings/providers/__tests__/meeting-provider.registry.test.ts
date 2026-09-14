import { describe, expect, it } from 'vitest'
import { MeetingProviderRegistry } from '../meeting-provider.registry'
import type { TranscriptProvider } from '../transcript-provider.contract'

function fakeProvider(id: 'fathom' | 'fireflies' | 'read_ai', withPush = true): TranscriptProvider {
  return {
    identity: {
      id,
      auth: 'api_key',
      manifest: { displayName: id, personalOnly: true, logoKey: id },
    },
    ...(withPush
      ? {
          push: {
            verify: () => true,
            parse: () => null,
            resolveSecret: async () => null,
          },
        }
      : {}),
    normalize: () => {
      throw new Error('not used')
    },
  }
}

describe('MeetingProviderRegistry', () => {
  it('registers a provider once and exposes it by id', () => {
    const registry = new MeetingProviderRegistry()
    const provider = fakeProvider('fathom')
    registry.register(provider)
    expect(registry.get('fathom')).toBe(provider)
    expect(registry.require('fathom')).toBe(provider)
    expect(registry.list()).toEqual([provider])
  })

  it('refuses to register the same provider twice', () => {
    const registry = new MeetingProviderRegistry()
    registry.register(fakeProvider('fireflies'))
    expect(() => registry.register(fakeProvider('fireflies'))).toThrow(/already registered/)
  })

  it('returns null for unknown ids and throws on require', () => {
    const registry = new MeetingProviderRegistry()
    expect(registry.get('read_ai')).toBeNull()
    expect(() => registry.require('read_ai')).toThrow(/not registered/)
  })

  it('describes capability groups so the UI knows what each provider can do', () => {
    const registry = new MeetingProviderRegistry()
    registry.register(fakeProvider('read_ai'))
    registry.register(fakeProvider('fireflies', false))
    expect(registry.capabilities()).toEqual([
      expect.objectContaining({
        id: 'read_ai',
        push: true,
        pull: false,
        listRecent: false,
        poll: false,
      }),
      expect.objectContaining({ id: 'fireflies', push: false, pull: false }),
    ])
  })
})
