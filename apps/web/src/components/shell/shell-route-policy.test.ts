import { describe, expect, it } from 'vitest'
import { isShellHomeRoute, isShellWorkspaceRoute } from './shell-route-policy'

describe('shell route policy', () => {
  it('treats the global artifacts library as a shell workspace route', () => {
    expect(isShellWorkspaceRoute('/artifacts')).toBe(true)
    expect(isShellWorkspaceRoute('/artifacts/anything')).toBe(true)
    expect(isShellHomeRoute('/artifacts')).toBe(false)
  })
})
