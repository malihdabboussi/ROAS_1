import type { RefObject } from 'react'

export const MIC_SAMPLE_RATE = 16000

export function startMicCapture(
  stream: MediaStream,
  ws: WebSocket,
  mutedRef: RefObject<boolean>,
): void {
  const audioCtx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE })
  const source = audioCtx.createMediaStreamSource(stream)
  const processor = audioCtx.createScriptProcessor(4096, 1, 1)

  processor.onaudioprocess = (event) => {
    if (ws.readyState !== WebSocket.OPEN) return
    if (mutedRef.current) return
    const input = event.inputBuffer.getChannelData(0)
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]!))
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }
    ws.send(buffer)
  }

  source.connect(processor)
  processor.connect(audioCtx.destination)
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
