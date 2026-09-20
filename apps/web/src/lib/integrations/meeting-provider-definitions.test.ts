import { describe, expect, it } from 'vitest'
import {
  definitionToIntegration,
  isDefinedNoteTakerId,
  type NoteTakerListing,
} from './meeting-provider-definitions'

const listing: NoteTakerListing = {
  id: 'def_1',
  slug: 'nt_otter',
  displayName: 'Otter',
  description: 'Otter transcripts into ROAS.',
  logoUrl: 'https://cdn.example.com/otter.png',
  requiresSecret: true,
  signatureHeader: 'X-Otter-Signature',
  isActive: true,
}

describe('isDefinedNoteTakerId', () => {
  it('accepts nt_ slugs and rejects built-ins and junk', () => {
    expect(isDefinedNoteTakerId('nt_otter')).toBe(true)
    expect(isDefinedNoteTakerId('NT_Otter')).toBe(true)
    expect(isDefinedNoteTakerId('fireflies')).toBe(false)
    expect(isDefinedNoteTakerId('nt_')).toBe(false)
    expect(isDefinedNoteTakerId('nt_has-dash')).toBe(false)
  })
})

describe('definitionToIntegration', () => {
  it('renders a signed tool as a Productivity row with one required secret field', () => {
    const integration = definitionToIntegration(listing)
    expect(integration).toMatchObject({
      id: 'nt_otter',
      provider: 'nt_otter',
      name: 'Otter',
      description: 'Otter transcripts into ROAS.',
      logo_url: 'https://cdn.example.com/otter.png',
      category: 'productivity',
      auth_type: 'api_key',
      is_active: true,
    })
    expect(integration.connection_fields).toEqual([
      expect.objectContaining({
        name: 'secret',
        label: 'Signing secret (sent in X-Otter-Signature)',
        required: true,
      }),
    ])
  })

  it('makes the secret optional for tools that do not sign, and writes a default description', () => {
    const integration = definitionToIntegration({
      ...listing,
      description: null,
      logoUrl: null,
      requiresSecret: false,
      signatureHeader: null,
    })
    expect(integration.description).toContain('Connect Otter')
    expect(integration.logo_url).toBeUndefined()
    expect(integration.connection_fields?.[0]).toMatchObject({ name: 'secret', required: false })
  })
})
