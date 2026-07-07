import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AlreadyExistsError, type Sandbox } from 'modal'
import { getModalApp, getModalImageBuilder, getModalSandboxClient } from '@vibey/api-shared'
import { SandboxesRepository } from '../repositories/sandboxes.repository'
import { SandboxProjectFilesService } from './sandbox-project-files.service'

const PORT = 3000
const SANDBOX_TIMEOUT_MS = 4 * 60 * 60 * 1000
const SANDBOX_IDLE_TIMEOUT_MS = 15 * 60 * 1000

export type EnsureSandboxOptions = {
  resetNextCache?: boolean
}

type EnsureRunningResult = { tunnelUrl: string; sandboxId: string; status: 'running' | 'starting' }

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name)
  private readonly ensureInflight = new Map<string, Promise<EnsureRunningResult>>()
  private imageRef: ReturnType<typeof getModalImageBuilder> extends {
    fromRegistry: (...args: any[]) => infer R
  }
    ? R
    : any

  constructor(
    private readonly repository: SandboxesRepository,
    private readonly projectFiles: SandboxProjectFilesService,
  ) {}

  private getImage() {
    if (!this.imageRef) {
      this.imageRef = getModalImageBuilder()
        .fromRegistry('node:22-slim')
        .dockerfileCommands([
          'RUN npm install -g pnpm@9',
          'RUN apt-get update && apt-get install -y netcat-openbsd procps && rm -rf /var/lib/apt/lists/*',
        ])
    }
    return this.imageRef
  }

  private sandboxName(projectId: string): string {
    return `project-${projectId}`.slice(0, 63)
  }

  private async isPortListening(sb: Sandbox): Promise<boolean> {
    try {
      const check = await sb.exec([
        'bash',
        '-c',
        `nc -z 127.0.0.1 ${PORT} && echo READY || echo WAIT`,
      ])
      const out = await check.stdout.readText()
      return out.trim() === 'READY'
    } catch {
      return false
    }
  }

  private async waitForSandboxPort(sb: Sandbox, projectId: string, context: string): Promise<void> {
    const pollStart = Date.now()
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const check = await sb.exec([
          'bash',
          '-c',
          `nc -z 127.0.0.1 ${PORT} && echo READY || echo WAIT`,
        ])
        const out = await check.stdout.readText()
        if (out.trim() === 'READY') {
          this.logger.log(
            `Sandbox ${sb.sandboxId} for project ${projectId} (${context}) ready in ${Date.now() - pollStart}ms`,
          )
          return
        }
      } catch {}
    }
    throw new Error(`Port ${PORT} not ready (${context})`)
  }

  private modalLogSuggestsCorruptNextBuild(logText: string): boolean {
    const chunkMissing =
      logText.includes("Cannot find module './") ||
      /Cannot find module '\.\/[0-9]+\.js'/.test(logText)
    const nextArtifacts = logText.includes('.next/server') || logText.includes('webpack-runtime.js')
    return chunkMissing && nextArtifacts
  }

  private async runNextDevAndWait(
    sb: Sandbox,
    projectId: string,
    context: string,
    opts: { clearNext: boolean; forcePnpmInstall?: boolean },
  ): Promise<void> {
    const kill = await sb.exec(['bash', '-c', 'pkill -f "next dev" || true; sleep 1'], {
      timeoutMs: 60_000,
    })
    await kill.wait()

    const installClause = opts.forcePnpmInstall
      ? 'pnpm install --prefer-offline && '
      : 'if [ ! -d node_modules ]; then pnpm install --prefer-offline; fi && '
    const clearClause = opts.clearNext ? 'rm -rf .next && ' : ''
    const inner = `${clearClause}${installClause}exec pnpm exec next dev --hostname 0.0.0.0 -p ${PORT}`

    await sb.exec(['bash', '-lc', `cd /project && ${inner}`], {
      stdout: 'ignore',
      stderr: 'ignore',
    })

    try {
      await this.waitForSandboxPort(sb, projectId, context)
    } catch (err) {
      let logText = ''
      let diagText = ''
      try {
        const probeScript = [
          'echo MODAL_LOG_START',
          '(command -v pgrep >/dev/null && pgrep -af next || true; command -v pgrep >/dev/null && pgrep -af node || true) | head -40',
          'echo MODAL_LOG_END',
          'echo PNPM_LOG_START',
          'echo "(install ran inside long exec; no separate pnpm log)"',
          'echo PNPM_LOG_END',
          'echo BOOT_LOG_START',
          'echo "(no bootstrap file; see Modal Sandbox.exec long-lived pattern)"',
          'echo BOOT_LOG_END',
          'echo LS_TMP_START',
          'ls -la /tmp 2>&1 | head -25',
          'echo LS_PROJECT_START',
          'ls -la /project 2>&1 | head -30',
          'echo PS_START',
          "ps aux 2>/dev/null | grep -E '[n]ode|[p]npm|[n]ext' | head -30 || true",
          'echo PS_END',
        ].join('; ')
        const probe = await sb.exec(['bash', '-c', probeScript])
        diagText = await probe.stdout.readText()
        const modalMatch = diagText.match(/MODAL_LOG_START\s*\r?\n([\s\S]*?)\r?\nMODAL_LOG_END/)
        logText = modalMatch?.[1]?.trim() ?? ''
        this.logger.error(
          `Port ${PORT} not ready (${context}, project ${projectId}). Sandbox diagnostics:\n${diagText}`,
        )
      } catch {
        /* ignore */
      }

      const corrupt = this.modalLogSuggestsCorruptNextBuild(logText)

      if (corrupt && !opts.clearNext) {
        this.logger.warn(
          `Stale .next chunks detected for project ${projectId}; clearing .next and restarting next dev once`,
        )
        await this.runNextDevAndWait(sb, projectId, context, {
          clearNext: true,
          forcePnpmInstall: opts.forcePnpmInstall,
        })
        return
      }
      throw err
    }
  }

  private async restartNextDevFresh(
    sb: Sandbox,
    supabase: SupabaseClient,
    projectId: string,
    project: {
      modal_snapshot_id?: string | null
      modal_snapshot_created_at?: string | null
    } | null,
    options?: { clearNext?: boolean },
  ): Promise<void> {
    this.logger.log(`Restarting next dev in sandbox ${sb.sandboxId} (project ${projectId})`)
    const probe = await sb.exec([
      'bash',
      '-c',
      'test -f /project/package.json && echo OK || echo MISSING',
    ])
    const layout = (await probe.stdout.readText()).trim()
    if (layout !== 'OK') {
      this.logger.warn(
        `Sandbox ${sb.sandboxId} (project ${projectId}): /project has no package.json; restoreProjectFiles before next dev`,
      )
      const { touchedDeps } = await this.projectFiles.restoreProjectFiles(
        sb,
        supabase,
        projectId,
        project,
      )
      await this.runNextDevAndWait(sb, projectId, 'dev refresh after restore', {
        clearNext: !!options?.clearNext,
        forcePnpmInstall: touchedDeps,
      })
      return
    }
    await this.runNextDevAndWait(sb, projectId, 'dev refresh', {
      clearNext: !!options?.clearNext,
    })
  }

  /** Clears DB bindings and terminates the sandbox without snapshotting (bad disk must not become the new snapshot). */
  private async discardModalSandboxAfterFailedDev(
    supabase: SupabaseClient,
    projectId: string,
    sb: Sandbox,
    context: string,
  ): Promise<void> {
    this.logger.warn(
      `Modal sandbox ${sb.sandboxId} (${context}) will not serve next dev for project ${projectId}; clearing bindings and terminating without snapshot`,
    )
    await this.repository.discardSandboxBinding(supabase, projectId)
    try {
      await sb.terminate({ wait: true })
    } catch (e) {
      this.logger.warn(`Modal terminate after failed dev (${sb.sandboxId}): ${e}`)
    }
  }

  async ensureRunning(
    supabase: SupabaseClient,
    projectId: string,
    options?: EnsureSandboxOptions,
  ): Promise<EnsureRunningResult> {
    const inflight = this.ensureInflight.get(projectId)
    if (inflight) return inflight

    const p = this.ensureRunningImpl(supabase, projectId, options).finally(() => {
      if (this.ensureInflight.get(projectId) === p) this.ensureInflight.delete(projectId)
    })
    this.ensureInflight.set(projectId, p)
    return p
  }

  private async ensureRunningImpl(
    supabase: SupabaseClient,
    projectId: string,
    options?: EnsureSandboxOptions,
  ): Promise<EnsureRunningResult> {
    const project = await this.repository.findProjectBinding(supabase, projectId)

    if (project?.modal_sandbox_id && project?.modal_tunnel_url) {
      const modal = getModalSandboxClient()
      let sb: Sandbox
      try {
        sb = await modal.sandboxes.fromId(project.modal_sandbox_id)
      } catch {
        this.logger.warn(`Sandbox ${project.modal_sandbox_id} is gone, creating new one`)
        await this.repository.clearSandboxBinding(supabase, projectId)
        return this.startSandbox(supabase, projectId, project, 0)
      }

      let skipDetachAfterTerminate = false
      try {
        const code = await sb.poll()
        if (code === null) {
          const listening = await this.isPortListening(sb)
          if (!listening || options?.resetNextCache) {
            if (!listening) {
              this.logger.warn(
                `Sandbox ${sb.sandboxId} (project ${projectId}): port ${PORT} not listening, restarting next dev`,
              )
            }
            try {
              await this.restartNextDevFresh(sb, supabase, projectId, project, {
                clearNext: options?.resetNextCache,
              })
            } catch {
              await this.discardModalSandboxAfterFailedDev(
                supabase,
                projectId,
                sb,
                'ensure-running reuse path',
              )
              skipDetachAfterTerminate = true
              return this.startSandbox(supabase, projectId, null, 1)
            }
          }
          return {
            tunnelUrl: project.modal_tunnel_url,
            sandboxId: project.modal_sandbox_id,
            status: 'running',
          }
        }
      } finally {
        if (!skipDetachAfterTerminate) sb.detach()
      }

      await this.repository.clearSandboxBinding(supabase, projectId)
    }

    return this.startSandbox(supabase, projectId, project, 0)
  }

  private async startSandbox(
    supabase: SupabaseClient,
    projectId: string,
    project: {
      modal_snapshot_id?: string | null
      modal_snapshot_created_at?: string | null
    } | null,
    recoveryDepth = 0,
  ): Promise<EnsureRunningResult> {
    if (recoveryDepth > 3) {
      throw new Error('Sandbox recovery failed after replacing broken Modal instance')
    }
    const modal = getModalSandboxClient()
    const app = await getModalApp()
    const image = this.getImage()
    const name = this.sandboxName(projectId)

    let sb: Sandbox
    try {
      sb = await modal.sandboxes.create(app, image, {
        name,
        encryptedPorts: [PORT],
        timeoutMs: SANDBOX_TIMEOUT_MS,
        idleTimeoutMs: SANDBOX_IDLE_TIMEOUT_MS,
        cpu: 1,
        memoryMiB: 1024,
        workdir: '/project',
      })
    } catch (err) {
      if (err instanceof AlreadyExistsError) {
        const appName = process.env.MODAL_APP_NAME || 'vibey-spaces-staging'
        sb = await modal.sandboxes.fromName(appName, name)
        const finished = await sb.poll()
        if (finished !== null) {
          this.logger.warn(
            `Named Modal sandbox "${name}" is not running (exit ${finished}); releasing handle and retrying create`,
          )
          try {
            await sb.terminate({ wait: true })
          } catch (e) {
            this.logger.warn(`terminate stale named sandbox (${name}): ${e}`)
          }
          sb.detach()
          return this.startSandbox(supabase, projectId, project, recoveryDepth + 1)
        }
        let tunnels: Awaited<ReturnType<Sandbox['tunnels']>>
        try {
          tunnels = await sb.tunnels()
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.includes('terminated') || msg.includes('FAILED_PRECONDITION')) {
            this.logger.warn(
              `tunnels() failed for named sandbox "${name}" (${msg}); retrying create after terminate`,
            )
            try {
              await sb.terminate({ wait: true })
            } catch (te) {
              this.logger.warn(`terminate after tunnels failure (${name}): ${te}`)
            }
            sb.detach()
            return this.startSandbox(supabase, projectId, project, recoveryDepth + 1)
          }
          throw e
        }
        const tunnelUrl = tunnels[PORT]?.url
        if (tunnelUrl) {
          await this.repository.updateSandboxTunnel(supabase, projectId, sb.sandboxId, tunnelUrl)
          let skipDetach = false
          try {
            const listening = await this.isPortListening(sb)
            if (!listening) {
              this.logger.warn(
                `Reattached sandbox ${sb.sandboxId} (project ${projectId}): port ${PORT} down, restarting next dev`,
              )
              try {
                await this.restartNextDevFresh(sb, supabase, projectId, project)
              } catch {
                await this.discardModalSandboxAfterFailedDev(
                  supabase,
                  projectId,
                  sb,
                  'AlreadyExists reattach',
                )
                skipDetach = true
                return this.startSandbox(supabase, projectId, null, recoveryDepth + 1)
              }
            }
          } finally {
            if (!skipDetach) sb.detach()
          }
          return { tunnelUrl, sandboxId: sb.sandboxId, status: 'running' }
        }
        sb.detach()
      }
      throw err
    }

    this.logger.log(`Created sandbox ${sb.sandboxId} for project ${projectId}`)

    const { touchedDeps } = await this.projectFiles.restoreProjectFiles(
      sb,
      supabase,
      projectId,
      project,
    )

    try {
      await this.runNextDevAndWait(sb, projectId, 'new sandbox', {
        clearNext: false,
        forcePnpmInstall: touchedDeps,
      })
    } catch {
      this.logger.error(`Sandbox ${sb.sandboxId} for project ${projectId} never became ready`)
      await sb.terminate()
      throw new Error('Sandbox failed to start next dev')
    }

    const tunnels = await sb.tunnels()
    const tunnelUrl = tunnels[PORT]?.url
    if (!tunnelUrl) {
      await sb.terminate()
      throw new Error('No tunnel URL returned from sandbox')
    }

    await this.repository.markSandboxRunning(supabase, projectId, sb.sandboxId, tunnelUrl)

    sb.detach()
    return { tunnelUrl, sandboxId: sb.sandboxId, status: 'running' }
  }

  async terminate(supabase: SupabaseClient, projectId: string): Promise<void> {
    const modalSandboxId = await this.repository.findProjectSandboxId(supabase, projectId)

    if (!modalSandboxId) return

    const modal = getModalSandboxClient()
    let sb: Sandbox
    try {
      sb = await modal.sandboxes.fromId(modalSandboxId)
    } catch {
      await this.repository.clearSandboxBinding(supabase, projectId)
      return
    }

    try {
      const snapshot = await sb.snapshotDirectory('/project')
      await this.repository.updateProjectSnapshot(
        supabase,
        projectId,
        (snapshot as any).imageId ?? (snapshot as any).id ?? String(snapshot),
      )
      this.logger.log(`Snapshot saved for project ${projectId}`)
    } catch (err) {
      this.logger.warn(`Failed to snapshot project ${projectId}: ${err}`)
    }

    await sb.terminate()

    await this.repository.markSandboxStopped(supabase, projectId)

    this.logger.log(`Terminated sandbox for project ${projectId}`)
  }

  async getStatus(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<'running' | 'stopped' | 'unknown'> {
    const modalSandboxId = await this.repository.findProjectSandboxId(supabase, projectId)

    if (!modalSandboxId) return 'stopped'

    try {
      const modal = getModalSandboxClient()
      const sb = await modal.sandboxes.fromId(modalSandboxId)
      const code = await sb.poll()
      sb.detach()
      return code === null ? 'running' : 'stopped'
    } catch {
      return 'unknown'
    }
  }
}
