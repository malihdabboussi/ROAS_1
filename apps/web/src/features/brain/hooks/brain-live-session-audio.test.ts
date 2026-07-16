import { describe, expect, it, vi } from 'vitest'
import { createMicCapture } from './brain-live-session-audio'

function createMockAudioContext() {
  const processor = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null as null | ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void),
  }
  const silentGain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  const source = { connect: vi.fn(), disconnect: vi.fn() }

  class MockAudioContext {
    state: AudioContextState = 'suspended'
    destination = {}
    createMediaStreamSource = vi.fn(() => source)
    createScriptProcessor = vi.fn(() => processor)
    createGain = vi.fn(() => silentGain)
    resume = vi.fn(async () => {
      this.state = 'running'
    })
    close = vi.fn(async () => undefined)
  }

  return { MockAudioContext, processor, silentGain, source }
}

describe('createMicCapture', () => {
  it('resumes AudioContext, silences destination output, and meters before WS attach', async () => {
    const { MockAudioContext, processor, silentGain, source } = createMockAudioContext()
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    })

    const mutedRef = { current: false }
    const levelRef = { current: 0 }
    const stream = { getTracks: () => [] } as unknown as MediaStream

    const capture = await createMicCapture(stream, mutedRef, levelRef)

    expect(silentGain.gain.value).toBe(0)
    expect(source.connect).toHaveBeenCalledWith(processor)
    expect(processor.connect).toHaveBeenCalledWith(silentGain)
    expect(silentGain.connect).toHaveBeenCalled()

    const noisy = new Float32Array(4)
    noisy[0] = 0.5
    noisy[1] = -0.5
    noisy[2] = 0.25
    noisy[3] = -0.25
    processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => noisy },
    })

    expect(levelRef.current).toBeGreaterThan(0)

    const ws = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket
    capture.setWebSocket(ws)

    processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => noisy },
    })
    expect(ws.send).toHaveBeenCalledTimes(1)

    capture.stop()
    expect(levelRef.current).toBe(0)
  })

  it('does not send PCM while muted', async () => {
    const { MockAudioContext, processor } = createMockAudioContext()
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    })

    const mutedRef = { current: true }
    const levelRef = { current: 0 }
    const capture = await createMicCapture(
      { getTracks: () => [] } as unknown as MediaStream,
      mutedRef,
      levelRef,
    )

    const ws = { readyState: WebSocket.OPEN, send: vi.fn() } as unknown as WebSocket
    capture.setWebSocket(ws)

    const noisy = new Float32Array([0.5, -0.5])
    processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => noisy },
    })

    expect(levelRef.current).toBeGreaterThan(0)
    expect(ws.send).not.toHaveBeenCalled()
    capture.stop()
  })
})
