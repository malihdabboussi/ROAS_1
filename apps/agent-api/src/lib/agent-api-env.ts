import { join } from 'path'

export function resolveAgentApiEnvFilePaths(cwd = process.cwd()): string[] {
  return [
    join(cwd, '.env'),
    join(cwd, '..', 'api', '.env'),
    join(cwd, 'apps', 'agent-api', '.env'),
    join(cwd, 'apps', 'api', '.env'),
  ]
}
