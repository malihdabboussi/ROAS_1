import type { Request } from 'express'

export function resolveBrainLiveMachineId(req: Request): string | null {
  const header = req.headers['fly-force-instance-id']
  if (typeof header === 'string' && header.trim().length > 0) return header.trim()
  const envMachineId = process.env.FLY_MACHINE_ID?.trim()
  return envMachineId && envMachineId.length > 0 ? envMachineId : null
}

export function resolveBrainLiveMachineWsUrl(req: Request, flyMachineUrl?: string | null): string | null {
  if (flyMachineUrl) {
    const base = flyMachineUrl.replace(/^https?:\/\//, '')
    return `wss://${base}`
  }

  const host = req.headers['host']
  if (host && !host.includes('localhost') && !host.startsWith('127.0.0.1')) {
    return `wss://${host}`
  }

  return null
}
