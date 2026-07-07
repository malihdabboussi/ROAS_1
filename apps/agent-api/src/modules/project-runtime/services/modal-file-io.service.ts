import { Injectable, Logger } from '@nestjs/common'
import type { Sandbox } from 'modal'
import { getModalSandboxClient } from '@vibey/api-shared'

const APP_NAME = process.env.MODAL_APP_NAME || 'vibey-spaces-staging'

@Injectable()
export class ModalFileIoService {
  private readonly logger = new Logger(ModalFileIoService.name)

  private normalizeProjectPath(rawPath: string, label: string): string {
    const normalized = rawPath.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/+$/, '').trim()
    if (!normalized || normalized.split('/').some((part) => part === '..')) {
      throw new Error(`Invalid ${label}: ${rawPath}`)
    }
    return normalized
  }

  private sandboxName(projectId: string): string {
    return `project-${projectId}`.slice(0, 63)
  }

  private async getSandbox(projectId: string): Promise<Sandbox> {
    const modal = getModalSandboxClient()
    return modal.sandboxes.fromName(APP_NAME, this.sandboxName(projectId))
  }

  private async execInProject(
    projectId: string,
    command: string,
  ): Promise<{ exitCode: number; output: string }> {
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec(['bash', '-c', `cd /project && ${command}`])
      const [stdout, stderr, exitCode] = await Promise.all([
        proc.stdout.readText().catch(() => ''),
        proc.stderr.readText().catch(() => ''),
        proc.wait(),
      ])
      const combined = `${stdout}${stderr}`.trim()
      return {
        exitCode: typeof exitCode === 'number' ? exitCode : 1,
        output: combined,
      }
    } finally {
      sb.detach()
    }
  }

  async writeProjectFile(projectId: string, filePath: string, content: string): Promise<void> {
    const normalized = this.normalizeProjectPath(filePath, 'file path')

    const sb = await this.getSandbox(projectId)
    try {
      const dir = normalized.includes('/')
        ? normalized.substring(0, normalized.lastIndexOf('/'))
        : null
      if (dir) {
        const mkdirProc = await sb.exec(['mkdir', '-p', `/project/${dir}`])
        await mkdirProc.wait()
      }
      const f = await sb.open(`/project/${normalized}`, 'w')
      await f.write(new TextEncoder().encode(content))
      await f.close()
    } finally {
      sb.detach()
    }
  }

  async readProjectFile(projectId: string, filePath: string): Promise<string> {
    const normalized = this.normalizeProjectPath(filePath, 'file path')

    const sb = await this.getSandbox(projectId)
    try {
      const f = await sb.open(`/project/${normalized}`, 'r')
      const bytes = await f.read()
      await f.close()
      return new TextDecoder().decode(bytes)
    } finally {
      sb.detach()
    }
  }

  async deleteProjectFile(projectId: string, filePath: string): Promise<void> {
    const normalized = this.normalizeProjectPath(filePath, 'file path')

    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec(['rm', '-f', `/project/${normalized}`])
      await proc.wait()
    } finally {
      sb.detach()
    }
  }

  async listProjectFiles(projectId: string): Promise<string[]> {
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec([
        'find',
        '/project',
        '-type',
        'f',
        '-not',
        '-path',
        '*/node_modules/*',
        '-not',
        '-path',
        '*/.next/*',
        '-not',
        '-path',
        '*/.turbo/*',
        '-not',
        '-path',
        '*/.vibey-kit/*',
      ])
      const stdout = await proc.stdout.readText()
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((p) => p.replace('/project/', ''))
        .sort()
    } finally {
      sb.detach()
    }
  }

  async ensureProjectDir(projectId: string): Promise<void> {
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec(['mkdir', '-p', '/project'])
      await proc.wait()
    } finally {
      sb.detach()
    }
  }

  async runInstall(projectId: string): Promise<void> {
    const result = await this.execInProject(projectId, 'pnpm install')
    if (result.exitCode !== 0) {
      throw new Error(`pnpm install failed: ${result.output || `exit code ${result.exitCode}`}`)
    }
  }

  async runProjectValidation(
    projectId: string,
    checks: string[],
  ): Promise<
    { check: string; pass: boolean; exitCode: number; output: string; skipped?: boolean }[]
  > {
    const commandMap: Record<string, string> = {
      typescript: 'npx tsc --noEmit',
      lint: 'npx next lint',
      build: 'npx next build',
    }

    let pkgJson: Record<string, unknown> | null = null
    const loadPkg = async (): Promise<Record<string, unknown> | null> => {
      if (pkgJson) return pkgJson
      try {
        const raw = await this.readProjectFile(projectId, 'package.json')
        pkgJson = JSON.parse(raw) as Record<string, unknown>
      } catch {
        pkgJson = null
      }
      return pkgJson
    }

    const isToolInstalled = async (check: string): Promise<boolean> => {
      const pkg = await loadPkg()
      if (!pkg) return true
      const deps = {
        ...((pkg.dependencies as Record<string, unknown>) ?? {}),
        ...((pkg.devDependencies as Record<string, unknown>) ?? {}),
      }
      if (check === 'lint') return 'eslint' in deps || 'eslint-config-next' in deps
      if (check === 'typescript') return 'typescript' in deps
      return true
    }

    const results: {
      check: string
      pass: boolean
      exitCode: number
      output: string
      skipped?: boolean
    }[] = []
    for (const check of checks) {
      const command = commandMap[check]
      if (!command) {
        results.push({ check, pass: false, exitCode: -1, output: `Unknown check: ${check}` })
        continue
      }
      if (!(await isToolInstalled(check))) {
        results.push({
          check,
          pass: true,
          skipped: true,
          exitCode: 0,
          output: `Skipped — ${check} tooling not installed in this project. Add it via \`update_project_deps\` (e.g. "eslint", "eslint-config-next") if you want this check to run.`,
        })
        continue
      }
      const result = await this.execInProject(projectId, command)
      results.push({
        check,
        pass: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.output.slice(-8000),
      })
    }
    return results
  }

  async getProjectLogs(projectId: string): Promise<{ stdout: string; stderr: string }> {
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec(['bash', '-lc', 'tail -n 300 /tmp/modal.log 2>/dev/null || true'])
      const stdout = await proc.stdout.readText().catch(() => '')
      const stderr = await proc.stderr.readText().catch(() => '')
      await proc.wait()
      return { stdout, stderr }
    } catch (err) {
      this.logger.warn(
        `[${projectId}] Failed to read sandbox logs: ${err instanceof Error ? err.message : String(err)}`,
      )
      return { stdout: '', stderr: '' }
    } finally {
      sb.detach()
    }
  }

  async listProjectDirectory(
    projectId: string,
    subPath?: string,
  ): Promise<Array<{ name: string; type: 'file' | 'directory'; path: string }>> {
    const normalized = subPath ? this.normalizeProjectPath(subPath, 'directory path') : ''
    const target = normalized ? `/project/${normalized}` : '/project'
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec(['ls', '-1F', target])
      const stdout = await proc.stdout.readText()
      const prefix = normalized

      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .filter((name) => !['node_modules/', '.next/', '.turbo/', '.vibey-kit/'].includes(name))
        .map((entry) => {
          const isDir = entry.endsWith('/')
          const name = isDir ? entry.slice(0, -1) : entry.replace(/[*@=|]$/, '')
          return {
            name,
            type: isDir ? ('directory' as const) : ('file' as const),
            path: prefix ? `${prefix}/${name}` : name,
          }
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } finally {
      sb.detach()
    }
  }

  async searchProjectFiles(
    projectId: string,
    query: string,
    maxResults = 20,
  ): Promise<Array<{ path: string; line: number; content: string }>> {
    const sb = await this.getSandbox(projectId)
    try {
      const proc = await sb.exec([
        'grep',
        '-rn',
        '--include=*.ts',
        '--include=*.tsx',
        '--include=*.js',
        '--include=*.jsx',
        '--include=*.json',
        '--include=*.css',
        '--include=*.html',
        '-m',
        String(maxResults),
        query,
        '/project',
      ])
      const stdout = await proc.stdout.readText()

      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(0, maxResults)
        .map((line) => {
          const match = line.match(/^\/project\/(.+?):(\d+):(.*)$/)
          if (!match) return null
          return {
            path: match[1]!,
            line: parseInt(match[2]!, 10),
            content: match[3]!.slice(0, 200),
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    } finally {
      sb.detach()
    }
  }
}
