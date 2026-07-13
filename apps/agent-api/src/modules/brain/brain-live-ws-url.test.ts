import { describe, expect, it } from 'vitest'
import {
  resolveBrainLiveMachineId,
  resolveBrainLiveMachineWsUrl,
} from './brain-live-ws-url'

describe('brain-live-ws-url', () => {
  it('resolves machine id from fly-force-instance-id header', () => {
    expect(
      resolveBrainLiveMachineId({
        headers: { 'fly-force-instance-id': 'machine-1' },
      } as never),
    ).toBe('machine-1')
  })

  it('returns null ws url for local agent-api host', () => {
    expect(
      resolveBrainLiveMachineWsUrl(
        { headers: { host: '127.0.0.1:3003' } } as never,
        null,
      ),
    ).toBeNull()
  })

  it('returns wss url for remote runtime host', () => {
    expect(
      resolveBrainLiveMachineWsUrl(
        { headers: { host: 'roas-runtimes.fly.dev' } } as never,
        null,
      ),
    ).toBe('wss://roas-runtimes.fly.dev')
  })
})
