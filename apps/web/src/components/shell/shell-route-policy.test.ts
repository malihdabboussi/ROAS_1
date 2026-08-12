import { describe, expect, it } from 'vitest'
import { isShellHomeRoute, isShellWorkspaceRoute } from './shell-route-policy'

describe('shell route policy', () => {
  it('treats the global artifacts library as a shell workspace route', () => {
    expect(isShellWorkspaceRoute('/artifacts')).toBe(true)
    expect(isShellWorkspaceRoute('/artifacts/anything')).toBe(true)
    expect(isShellHomeRoute('/artifacts')).toBe(false)
  })

  it('treats all-tasks as a shell workspace route', () => {
    expect(isShellWorkspaceRoute('/all-tasks')).toBe(true)
    expect(isShellHomeRoute('/all-tasks')).toBe(false)
  })

  it('only treats the exact home route as the full chat surface', () => {
    expect(isShellHomeRoute('/home')).toBe(true)
    expect(isShellHomeRoute('/home/inbox')).toBe(false)
    expect(isShellHomeRoute('/home/meetings')).toBe(false)
    expect(isShellHomeRoute('/home/my-tasks')).toBe(false)
  })
})
