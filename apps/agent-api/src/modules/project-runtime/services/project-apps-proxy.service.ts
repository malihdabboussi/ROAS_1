import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { RequestScope } from '@vibey/api-shared'
import { ProjectRuntimeRepository } from '../repositories/project-runtime.repository'

@Injectable()
export class ProjectAppsProxyService {
  private readonly logger = new Logger(ProjectAppsProxyService.name)
  private readonly restarting = new Set<string>()

  constructor(
    private readonly config: ConfigService,
    private readonly repository: ProjectRuntimeRepository,
  ) {}

  async restart(
    scope: RequestScope,
    projectId: string,
  ): Promise<{ statusCode?: number; body: Record<string, unknown> }> {
    if (this.restarting.has(projectId)) {
      return { body: { success: true, status: 'starting', deduped: true } }
    }

    try {
      const { data: project, error: projectErr } = await this.repository.findProjectForRestart(
        scope,
        projectId,
      )
      if (projectErr || !project?.user_id) {
        this.logger.error(`[Restart] Failed to load project owner for ${projectId}`)
        return { statusCode: 404, body: { success: false, error: 'Project not found' } }
      }

      this.restarting.add(projectId)

      const { error: upErr } = await this.repository.markProjectStarting(projectId, project.user_id)

      if (upErr) {
        this.restarting.delete(projectId)
        this.logger.error(`[Restart] DB update failed: ${upErr.message}`)
        return { statusCode: 500, body: { success: false, error: 'Failed to restart project' } }
      }

      void this.startInBackground(projectId, project.user_id)
      return { body: { success: true, status: 'starting' } }
    } catch (err) {
      this.restarting.delete(projectId)
      this.logger.error(`[Restart] Failed to restart project ${projectId}: ${err}`)
      return { statusCode: 500, body: { success: false, error: 'Failed to restart project' } }
    }
  }

  private startInBackground(projectId: string, userId: string): void {
    void (async () => {
      try {
        await this.callSandboxApi(projectId, userId, 'terminate')
        await this.callSandboxApi(projectId, userId, 'ensure-running')

        await this.repository.markProjectRunning(projectId)
      } catch (err) {
        this.logger.error(`[Restart] Background start failed for ${projectId}: ${err}`)
        await this.repository.markProjectRestartError(
          projectId,
          err instanceof Error ? err.message : String(err),
        )
      } finally {
        this.restarting.delete(projectId)
      }
    })()
  }

  private async callSandboxApi(
    projectId: string,
    userId: string,
    action: 'terminate' | 'ensure-running',
  ): Promise<void> {
    const mainApiUrl = this.config.get<string>('MAIN_API_URL') || 'http://localhost:3001'
    const internalToken =
      this.config.get<string>('INTERNAL_API_TOKEN') || process.env.INTERNAL_API_TOKEN || ''
    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN is required for sandbox restart')
    }

    const response = await fetch(`${mainApiUrl}/api/sandboxes/${projectId}/${action}`, {
      method: 'POST',
      headers: {
        'x-internal-token': internalToken,
        'x-user-id': userId,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Sandbox ${action} failed (${response.status}): ${body}`)
    }
  }
}
