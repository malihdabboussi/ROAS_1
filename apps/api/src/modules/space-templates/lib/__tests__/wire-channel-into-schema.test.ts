import { describe, expect, it } from 'vitest'
import { stripChannelViews, wireChannelIntoSchema } from '../wire-channel-into-schema'

describe('wireChannelIntoSchema', () => {
  it('wires channel_id on channel views', () => {
    const schema = {
      version: 1,
      views: [
        { id: 'channel', type: 'channel', name: '#ops' },
        { id: 'list', type: 'list', name: 'List' },
      ],
    }
    const wired = wireChannelIntoSchema(schema, 'ch-1')
    expect(wired.views[0]).toMatchObject({
      type: 'channel',
      channel_config: { channel_id: 'ch-1' },
    })
    expect(wired.views[1]).toEqual(schema.views[1])
  })

  it('strips channel views when opted out', () => {
    const schema = {
      version: 1,
      views: [
        { id: 'channel', type: 'channel', name: '#ops' },
        { id: 'list', type: 'list', name: 'List' },
      ],
    }
    const stripped = stripChannelViews(schema)
    expect(stripped.views).toHaveLength(1)
    expect(stripped.views[0]?.type).toBe('list')
  })
})
