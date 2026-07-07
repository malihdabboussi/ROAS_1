import { Injectable } from '@nestjs/common'
import type { ModalFileIoService } from '../../project-runtime/services/modal-file-io.service'

type ProjectMeta = {
  id?: string
  storage_path?: string
  deploy_status?: string
  modal_tunnel_url?: string
}

type RuntimeProjectAuthorizer = (
  target: Record<string, any>,
  projectId: string,
  sessionKey?: string,
) => Promise<
  { ok: true; project: ProjectMeta } | { ok: false; response: { success: false; error: string } }
>

type RuntimeContext = {
  hasRuntime: boolean
  modalFileIo: ModalFileIoService | null
  requireRuntimeProject: RuntimeProjectAuthorizer
}

@Injectable()
export class ArtifactProjectRuntimeActionsService {
  async getProjectLogs(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime || !runtime.modalFileIo) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response
    const project = authorized.project
    const logs = await runtime.modalFileIo.getProjectLogs(projectId)

    return {
      success: true,
      project_id: projectId,
      status: project?.deploy_status ?? 'unknown',
      stdout: logs.stdout.slice(-5000),
      stderr: logs.stderr.slice(-5000),
    }
  }

  async validateProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime || !runtime.modalFileIo) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    const rawChecks = Array.isArray(input.checks) ? input.checks : ['typescript', 'lint']
    const checks = rawChecks.map(String).filter(Boolean)
    const results = await runtime.modalFileIo.runProjectValidation(projectId, checks)
    const allPassed = results.every((r) => r.pass)

    return {
      success: true,
      project_id: projectId,
      all_passed: allPassed,
      checks: results,
    }
  }

  async restartProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    onProgress: ((message: string) => void | Promise<void>) | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    if (onProgress) await onProgress('Terminating sandbox...')
    await target.mainApiCall('POST', `/api/sandboxes/${projectId}/terminate`, sessionKey)

    if (onProgress) await onProgress('Starting sandbox...')
    const ensureResult = (await target.mainApiCall(
      'POST',
      `/api/sandboxes/${projectId}/ensure-running`,
      sessionKey,
    )) as { tunnelUrl?: string } | null

    void target
      .mainApiCall('PATCH', `/api/projects/${projectId}`, sessionKey, {
        status: 'running',
        deploy_status: 'running',
        deploy_error: null,
        last_deployed_at: new Date().toISOString(),
      })
      .catch(() => {})

    return {
      success: true,
      project_id: projectId,
      status: 'running',
      tunnel_url: ensureResult?.tunnelUrl ?? null,
    }
  }

  async fetchProjectUrl(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    const ensureResult = (await target.mainApiCall(
      'POST',
      `/api/sandboxes/${projectId}/ensure-running`,
      sessionKey,
    )) as { tunnelUrl?: string; status?: string } | null

    return {
      success: true,
      project_id: projectId,
      url: ensureResult?.tunnelUrl ?? null,
      local_url: ensureResult?.tunnelUrl ?? null,
      status: ensureResult?.status ?? 'running',
    }
  }

  async searchProjectFiles(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    const query = String(input.query ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    if (!query) return { success: false, error: 'query is required' }

    if (!runtime.hasRuntime || !runtime.modalFileIo) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    const maxResults = typeof input.max_results === 'number' ? input.max_results : 20
    const results = await runtime.modalFileIo.searchProjectFiles(projectId, query, maxResults)

    return {
      success: true,
      project_id: projectId,
      query,
      results,
      count: results.length,
    }
  }

  async listProjectDirectory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime || !runtime.modalFileIo) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    const subPath = typeof input.path === 'string' ? input.path : undefined
    const entries = await runtime.modalFileIo.listProjectDirectory(projectId, subPath)

    return {
      success: true,
      project_id: projectId,
      path: subPath ?? '/',
      entries,
      count: entries.length,
    }
  }

  async getProjectErrors(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    runtime: RuntimeContext,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (!runtime.hasRuntime || !runtime.modalFileIo) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await runtime.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response

    const logs = await runtime.modalFileIo.getProjectLogs(projectId)
    let runtimeErrors: unknown[] = []
    let status = 'unknown'
    try {
      const ensureResult = (await target.mainApiCall(
        'POST',
        `/api/sandboxes/${projectId}/ensure-running`,
        sessionKey,
      )) as { tunnelUrl?: string; status?: string } | null
      status = ensureResult?.status ?? 'running'
      if (ensureResult?.tunnelUrl) {
        const res = await fetch(`${ensureResult.tunnelUrl}/api/__errors`, {
          signal: AbortSignal.timeout(3_000),
        })
        if (res.ok) {
          const json = (await res.json()) as { errors?: unknown[] }
          runtimeErrors = json.errors ?? []
        }
      }
    } catch {}

    return {
      success: true,
      project_id: projectId,
      status,
      runtime_errors: runtimeErrors,
      stderr: logs.stderr.slice(-3000),
    }
  }
}
