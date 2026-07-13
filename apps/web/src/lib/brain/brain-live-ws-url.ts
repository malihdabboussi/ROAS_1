export function resolveBrainLiveWsOrigin(options: {
  machineWsBase?: string | null
  publicWsUrl?: string | null
  windowHostname?: string
}): string {
  const machineWsBase = options.machineWsBase?.trim()
  if (machineWsBase) return machineWsBase.replace(/\/$/, '')

  const publicWsUrl = options.publicWsUrl?.trim()
  if (publicWsUrl) return publicWsUrl.replace(/\/$/, '')

  const host = options.windowHostname ?? ''
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'ws://127.0.0.1:3003'
  }

  return `wss://${host}`
}

export function buildBrainLiveWsUrl(
  origin: string,
  sessionId: string,
  userId: string,
  machineId?: string | null,
): string {
  const params = new URLSearchParams({
    session: sessionId,
    userId,
  })
  if (machineId) params.set('machineId', machineId)
  return `${origin.replace(/\/$/, '')}/api/brain/live-ws?${params.toString()}`
}

export function describeBrainLiveWsClose(code: number, reason: string): string | null {
  if (code === 4001) return 'Missing session credentials.'
  if (code === 4002) return 'Voice session expired. Try again.'
  if (code === 4003) return 'Voice is not configured on the server.'
  if (code === 4004) return 'Could not connect to the voice provider.'
  if (code === 4005) return 'Could not connect to the voice provider.'
  if (code === 1011) return reason || 'Voice billing failed.'
  if (code === 1006) return 'Connection error'
  return null
}
