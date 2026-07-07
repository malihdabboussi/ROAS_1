import { createHmac, timingSafeEqual } from 'node:crypto'

const PROJECT_SESSION_KEY_PREFIX = 'vps_'

export function deriveProjectSessionKey(projectId: string, rootSecret: string | undefined): string {
  const normalizedProjectId = projectId.trim()
  const secret = rootSecret?.trim() ?? ''
  if (!normalizedProjectId || !secret) return ''

  const digest = createHmac('sha256', secret).update(normalizedProjectId).digest('base64url')
  return `${PROJECT_SESSION_KEY_PREFIX}${digest}`
}

export function verifyProjectSessionKey(
  projectId: string,
  sessionKey: string | undefined,
  rootSecret: string | undefined,
): boolean {
  const expected = deriveProjectSessionKey(projectId, rootSecret)
  const candidate = sessionKey?.trim() ?? ''
  if (!expected || !candidate) return false

  const expectedBuffer = Buffer.from(expected)
  const candidateBuffer = Buffer.from(candidate)
  return (
    expectedBuffer.length === candidateBuffer.length &&
    timingSafeEqual(expectedBuffer, candidateBuffer)
  )
}
