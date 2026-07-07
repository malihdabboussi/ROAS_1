import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { resolveAgentApiEnvFilePaths } from './agent-api-env'

describe('resolveAgentApiEnvFilePaths', () => {
  it('loads the agent env first and the sibling api env as a local fallback', () => {
    const cwd = join('/repo', 'apps', 'agent-api')

    expect(resolveAgentApiEnvFilePaths(cwd).slice(0, 2)).toEqual([
      join(cwd, '.env'),
      join('/repo', 'apps', 'api', '.env'),
    ])
  })

  it('also supports being launched from the repository root', () => {
    const cwd = '/repo'

    expect(resolveAgentApiEnvFilePaths(cwd)).toContain(join('/repo', 'apps', 'agent-api', '.env'))
    expect(resolveAgentApiEnvFilePaths(cwd)).toContain(join('/repo', 'apps', 'api', '.env'))
  })
})
