import { describe, expect, it } from 'vitest'
import {
  buildBrainLiveWsUrl,
  describeBrainLiveWsClose,
  resolveBrainLiveWsOrigin,
} from './brain-live-ws-url'

describe('resolveBrainLiveWsOrigin', () => {
  it('prefers machine ws base from live-session', () => {
    expect(
      resolveBrainLiveWsOrigin({
        machineWsBase: 'wss://roas-runtimes.fly.dev/',
        windowHostname: '127.0.0.1',
      }),
    ).toBe('wss://roas-runtimes.fly.dev')
  })

  it('falls back to local agent-api when dev server uses 127.0.0.1', () => {
    expect(
      resolveBrainLiveWsOrigin({
        machineWsBase: null,
        windowHostname: '127.0.0.1',
      }),
    ).toBe('ws://127.0.0.1:3003')
  })

  it('falls back to local agent-api for localhost', () => {
    expect(
      resolveBrainLiveWsOrigin({
        machineWsBase: null,
        windowHostname: 'localhost',
      }),
    ).toBe('ws://127.0.0.1:3003')
  })

  it('uses NEXT_PUBLIC_API_WS_URL when machine ws base is missing', () => {
    expect(
      resolveBrainLiveWsOrigin({
        machineWsBase: null,
        publicWsUrl: 'wss://runtime.example.test',
        windowHostname: '127.0.0.1',
      }),
    ).toBe('wss://runtime.example.test')
  })
})

describe('buildBrainLiveWsUrl', () => {
  it('builds the live websocket path with optional machine id', () => {
    expect(
      buildBrainLiveWsUrl('ws://127.0.0.1:3003', 'session-1', 'user-1', 'machine-1'),
    ).toBe(
      'ws://127.0.0.1:3003/api/brain/live-ws?session=session-1&userId=user-1&machineId=machine-1',
    )
  })
})

describe('describeBrainLiveWsClose', () => {
  it('maps known close codes to user-facing errors', () => {
    expect(describeBrainLiveWsClose(4002, 'Invalid or expired session')).toBe(
      'Voice session expired. Try again.',
    )
    expect(describeBrainLiveWsClose(1006, '')).toBe('Connection error')
  })
})
