import { describe, expect, it } from 'vitest'
import { deriveProjectSessionKey, verifyProjectSessionKey } from './project-session-key'

describe('project session keys', () => {
  it('derives different runtime keys for different projects from the same root secret', () => {
    const projectOneKey = deriveProjectSessionKey('project-1', 'root-secret')
    const projectTwoKey = deriveProjectSessionKey('project-2', 'root-secret')

    expect(projectOneKey).toMatch(/^vps_/)
    expect(projectTwoKey).toMatch(/^vps_/)
    expect(projectOneKey).not.toBe(projectTwoKey)
    expect(projectOneKey).not.toBe('root-secret')
  })

  it('only verifies the key for the project it was derived for', () => {
    const projectOneKey = deriveProjectSessionKey('project-1', 'root-secret')

    expect(verifyProjectSessionKey('project-1', projectOneKey, 'root-secret')).toBe(true)
    expect(verifyProjectSessionKey('project-2', projectOneKey, 'root-secret')).toBe(false)
    expect(verifyProjectSessionKey('project-1', 'root-secret', 'root-secret')).toBe(false)
  })

  it('rejects missing inputs instead of producing a reusable global key', () => {
    expect(deriveProjectSessionKey('', 'root-secret')).toBe('')
    expect(deriveProjectSessionKey('project-1', '')).toBe('')
    expect(verifyProjectSessionKey('project-1', undefined, 'root-secret')).toBe(false)
  })
})
