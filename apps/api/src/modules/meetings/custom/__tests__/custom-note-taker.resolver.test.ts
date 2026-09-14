import { describe, expect, it, vi } from 'vitest'
import { MeetingProviderRegistry } from '../../providers/meeting-provider.registry'
import type { TranscriptProvider } from '../../providers/transcript-provider.contract'
import { CustomNoteTakerResolver } from '../custom-note-taker.resolver'
import type { NoteTakerDefinition } from '../note-taker-definition.schema'

const definition: NoteTakerDefinition = {
  id: 'def_1',
  slug: 'nt_otter',
  displayName: 'Otter',
  signature: { scheme: 'none' },
  event: {},
  fieldMap: { externalId: 'id', transcript: { path: 'turns[]', text: 'text' } },
  isActive: true,
  createdBy: 'admin_1',
  createdAt: '',
  updatedAt: '',
}

const builtIn: TranscriptProvider = {
  identity: {
    id: 'fathom',
    auth: 'oauth2',
    manifest: { displayName: 'Fathom', personalOnly: true, logoKey: 'fathom' },
  },
  push: { verify: () => true, parse: () => null, resolveSecret: async () => null },
  normalize: () => {
    throw new Error('unused')
  },
}

function setup() {
  const registry = new MeetingProviderRegistry()
  registry.register(builtIn)
  const definitions = {
    findBySlug: vi.fn(async (slug: string) => (slug === 'nt_otter' ? definition : null)),
    listActive: vi.fn().mockResolvedValue([definition]),
  }
  const vault = { getSecret: vi.fn().mockResolvedValue('vault-secret') }
  const resolver = new CustomNoteTakerResolver(registry, definitions as never, vault as never)
  resolver.onModuleInit()
  return { registry, definitions, vault, resolver }
}

describe('CustomNoteTakerResolver through the registry', () => {
  it('serves built-ins from the map and definitions from the database', async () => {
    const { registry, definitions } = setup()
    await expect(registry.resolve('fathom')).resolves.toBe(builtIn)
    expect(definitions.findBySlug).not.toHaveBeenCalled()

    const custom = await registry.resolve('nt_otter')
    expect(custom?.identity).toMatchObject({ id: 'nt_otter', auth: 'signing_key' })
    expect(definitions.findBySlug).toHaveBeenCalledWith('nt_otter', { activeOnly: true })
    expect(custom?.push).toBeDefined()
  })

  it('returns null for unknown or non-custom ids without a database read', async () => {
    const { registry, definitions } = setup()
    await expect(registry.resolve('nt_missing')).resolves.toBeNull()
    await expect(registry.resolve('read_ai')).resolves.toBeNull()
    expect(definitions.findBySlug).toHaveBeenCalledTimes(1)
  })

  it('lists built-in and defined capabilities together', async () => {
    const { registry } = setup()
    await expect(registry.listCapabilities()).resolves.toEqual([
      expect.objectContaining({ id: 'fathom', push: true }),
      expect.objectContaining({
        id: 'nt_otter',
        auth: 'signing_key',
        push: true,
        pull: false,
        listRecent: false,
        manifest: { displayName: 'Otter', personalOnly: true, logoKey: 'nt_otter' },
      }),
    ])
  })

  it('refuses a second resolver', () => {
    const { registry, resolver } = setup()
    expect(() => registry.registerResolver(resolver)).toThrow(/already registered/)
  })
})
