import type { RefObject } from 'react'

export const MIC_SAMPLE_RATE = 16000

export async function ensureAudioContextRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

export interface MicCaptureHandle {
  setWebSocket: (ws: WebSocket | null) => void
  resume: () => Promise<void>
  stop: () => void
}

/**
 * Open the mic capture graph immediately (close to the user gesture) so the
 * AudioContext can leave "suspended" and levels update before the WS is ready.
 * PCM is only forwarded once setWebSocket() receives an open socket.
 */
export async function createMicCapture(
  stream: MediaStream,
  mutedRef: RefObject<boolean>,
  micInputLevelRef?: RefObject<number>,
): Promise<MicCaptureHandle> {
  const audioCtx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE })
  await ensureAudioContextRunning(audioCtx)

  const source = audioCtx.createMediaStreamSource(stream)
  const processor = audioCtx.createScriptProcessor(4096, 1, 1)
  // Keep the ScriptProcessor graph alive without routing mic into speakers
  // (full-gain destination + echoCancellation often silences the input).
  const silentGain = audioCtx.createGain()
  silentGain.gain.value = 0

  let ws: WebSocket | null = null
  let stopped = false

  processor.onaudioprocess = (event) => {
    if (stopped) return
    const input = event.inputBuffer.getChannelData(0)

    if (micInputLevelRef) {
      let sum = 0
      for (let i = 0; i < input.length; i++) {
        const sample = input[i]!
        sum += sample * sample
      }
      micInputLevelRef.current = Math.sqrt(sum / input.length)
    }

    if (mutedRef.current) return
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]!))
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }
    ws.send(buffer)
  }

  source.connect(processor)
  processor.connect(silentGain)
  silentGain.connect(audioCtx.destination)

  return {
    setWebSocket: (next) => {
      ws = next
    },
    resume: async () => {
      if (stopped) return
      await ensureAudioContextRunning(audioCtx)
    },
    stop: () => {
      stopped = true
      ws = null
      try {
        processor.disconnect()
        silentGain.disconnect()
        source.disconnect()
      } catch {
        // Nodes may already be disconnected during teardown.
      }
      void audioCtx.close().catch(() => {})
      if (micInputLevelRef) micInputLevelRef.current = 0
    },
  }
}

export async function checkMicPermission(): Promise<string | null> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (result.state === 'denied') {
      return 'Microphone access is blocked. Please enable it in your browser settings.'
    }
  } catch {
    // Permissions API is unavailable in some browsers; getUserMedia handles it.
  }
  return null
}

export function classifyMicError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Microphone permission denied. Please allow access and try again.'
    }
    if (error.name === 'NotFoundError') {
      return 'No microphone found. Please connect a microphone and try again.'
    }
  }
  return error instanceof Error ? error.message : 'Failed to access microphone'
}

export async function getUserId(): Promise<string> {
  const { createBrowserClient } = await import('@supabase/ssr')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id ?? ''
}
