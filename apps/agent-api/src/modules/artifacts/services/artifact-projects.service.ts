import { Injectable } from '@nestjs/common'
import type { ModalFileIoService } from '../../project-runtime/services/modal-file-io.service'
import type { ProjectStorageSyncService } from '../../project-runtime/services/project-storage-sync.service'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactProjectRuntimeActionsService } from './artifact-project-runtime-actions.service'
import { ArtifactProjectValidationService } from './artifact-project-validation.service'

const MANIFEST_SKIP_PATTERNS = [
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^bun\.lock$/,
  /^tsconfig\.tsbuildinfo$/,
  /^next-env\.d\.ts$/,
  /^next\.config\.js$/,
  /^app\/__error-collector\.tsx$/,
  /^app\/api\/__errors\/route\.ts$/,
]

function filterManifestFiles(files: string[]): string[] {
  return files.filter((f) => {
    const name = f.split('/').pop() ?? f
    return !MANIFEST_SKIP_PATTERNS.some((p) => p.test(name) || p.test(f))
  })
}

const CODE_FILE_RE =
  /\.(tsx?|jsx?)$|(^|\/)(tsconfig(\..+)?\.json|package\.json|next\.config\.(m?js|ts))$/i

type ProjectMeta = {
  id?: string
  storage_path?: string
  deploy_status?: string
  modal_tunnel_url?: string
}

@Injectable()
export class ArtifactProjectsService {
  private modalFileIo: ModalFileIoService | null = null
  private storageSync: ProjectStorageSyncService | null = null

  constructor(
    private readonly runtimeActions: ArtifactProjectRuntimeActionsService = new ArtifactProjectRuntimeActionsService(),
    private readonly validationService: ArtifactProjectValidationService = new ArtifactProjectValidationService(),
  ) {}

  setRuntimeServices(
    modalFileIo: ModalFileIoService,
    storageSync: ProjectStorageSyncService,
  ): void {
    this.modalFileIo = modalFileIo
    this.storageSync = storageSync
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_project: (data, sessionKey) => this.createProject(target, data, sessionKey),
      get_project: (data, sessionKey) => this.getProject(target, data, sessionKey),
      list_projects: (_data, sessionKey) => this.listProjects(target, sessionKey),
      create_file: (data, sessionKey) => this.upsertFile(target, data, sessionKey),
      update_file: (data, sessionKey) => this.upsertFile(target, data, sessionKey),
      read_file: (data, sessionKey) => this.readFile(target, data, sessionKey),
      delete_file: (data, sessionKey) => this.deleteFile(target, data, sessionKey),
      list_project_files: (data, sessionKey) => this.listProjectFiles(target, data, sessionKey),
      update_project_deps: (data, sessionKey) => this.updateProjectDeps(target, data, sessionKey),
      import_github_repo: (data, sessionKey) => this.importGitHubRepo(target, data, sessionKey),
      get_project_logs: (data, sessionKey) => this.getProjectLogs(target, data, sessionKey),
      validate_project: (data, sessionKey) => this.validateProject(target, data, sessionKey),
      restart_project: (data, sessionKey, onProgress) =>
        this.restartProject(target, data, sessionKey, onProgress),
      fetch_project_url: (data, sessionKey) => this.fetchProjectUrl(target, data, sessionKey),
      patch_file: (data, sessionKey) => this.patchFile(target, data, sessionKey),
      search_project_files: (data, sessionKey) => this.searchProjectFiles(target, data, sessionKey),
      list_project_directory: (data, sessionKey) =>
        this.listProjectDirectory(target, data, sessionKey),
      get_project_errors: (data, sessionKey) => this.getProjectErrors(target, data, sessionKey),
    }
  }

  private get hasRuntime(): boolean {
    return !!this.modalFileIo && !!this.storageSync
  }

  private getRuntimeContext() {
    return {
      hasRuntime: this.hasRuntime,
      modalFileIo: this.modalFileIo,
      requireRuntimeProject: (
        target: Record<string, any>,
        projectId: string,
        sessionKey?: string,
      ) => this.requireRuntimeProject(target, projectId, sessionKey),
    }
  }

  private projectAccessDenied(projectId: string): { success: false; error: string } {
    return {
      success: false,
      error: `Project not found or access denied: ${projectId}`,
    }
  }

  private async requireRuntimeProject(
    target: Record<string, any>,
    projectId: string,
    sessionKey?: string,
  ): Promise<
    { ok: true; project: ProjectMeta } | { ok: false; response: { success: false; error: string } }
  > {
    const project = await this.getProjectMeta(target, projectId, sessionKey)
    if (!project) {
      return { ok: false, response: this.projectAccessDenied(projectId) }
    }
    return { ok: true, project }
  }

  private async createProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const name = String(input.name ?? '').trim()
    if (!name) return { success: false, error: 'name is required' }
    const conversationId = sessionKey ? target.parseConversationId(sessionKey) : null

    const result = await target.mainApiCall('POST', '/api/projects', sessionKey, {
      name,
      description: typeof input.description === 'string' ? input.description : undefined,
      entry_point: 'App.tsx',
      dependencies:
        input.dependencies &&
        typeof input.dependencies === 'object' &&
        !Array.isArray(input.dependencies)
          ? input.dependencies
          : undefined,
      manifest:
        input.manifest && typeof input.manifest === 'object' && !Array.isArray(input.manifest)
          ? input.manifest
          : undefined,
      conversation_id: conversationId,
    })

    if (this.hasRuntime && result && typeof result === 'object' && 'project' in result) {
      const project = (result as any).project
      if (project?.id) {
        await this.modalFileIo!.ensureProjectDir(project.id)
      }
    }

    return result
  }

  private async getProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    return target.mainApiCall('GET', `/api/projects/${projectId}`, sessionKey)
  }

  private async listProjects(target: Record<string, any>, sessionKey?: string) {
    return target.mainApiCall('GET', '/api/projects', sessionKey)
  }

  private async upsertFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    const filePath = String(input.path ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    if (!filePath) return { success: false, error: 'path is required' }
    const content = String(input.content ?? '')

    if (this.hasRuntime) {
      const authorized = await this.requireRuntimeProject(target, projectId, sessionKey)
      if (!authorized.ok) return authorized.response
      const project = authorized.project

      await this.modalFileIo!.writeProjectFile(projectId, filePath, content)

      const conversationId = sessionKey ? target.parseConversationId?.(sessionKey) : null
      if (conversationId && target.streamRegistry) {
        const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
        const truncated = content.length > 200_000 ? content.slice(0, 200_000) : content
        void target.streamRegistry.emitEvent(conversationId, 'file_changed', {
          project_id: projectId,
          path: normalizedPath,
          content: truncated,
        })
      }

      const userId = target.resolveUserId(sessionKey)
      const storagePath = project?.storage_path

      if (storagePath) {
        this.storageSync!.queueUpsert(projectId, storagePath, filePath, content)
      }

      const existingFiles = await this.modalFileIo!.listProjectFiles(projectId)
      const manifestFiles = filterManifestFiles(existingFiles)
      if (storagePath) {
        void this.storageSync!.queueManifestUpdate(projectId, userId, { files: manifestFiles })
      }

      void target
        .mainApiCall('PATCH', `/api/projects/${projectId}`, sessionKey, {
          manifest: { files: manifestFiles },
        })
        .catch(() => {})

      const isPackageJson = filePath === 'package.json' || filePath === '/package.json'
      if (isPackageJson) {
        void this.modalFileIo!.runInstall(projectId).catch(() => {})
      }

      if (existingFiles.includes('package.json')) {
        void target
          .mainApiCall('PATCH', `/api/projects/${projectId}`, sessionKey, {
            deploy_status: 'starting',
            deploy_error: null,
          })
          .catch(() => {})

        void target
          .mainApiCall('POST', `/api/sandboxes/${projectId}/ensure-running`, sessionKey)
          .then(async () => {
            await target
              .mainApiCall('PATCH', `/api/projects/${projectId}`, sessionKey, {
                status: 'running',
                deploy_status: 'running',
                deploy_error: null,
                last_deployed_at: new Date().toISOString(),
              })
              .catch(() => {})
          })
          .catch(() => {})
      }

      if (CODE_FILE_RE.test(filePath)) {
        const validation = await this.validationService.debouncedValidation(
          projectId,
          this.modalFileIo,
        )
        if (!validation.passed) {
          return {
            success: false,
            path: filePath,
            file_written: true,
            error:
              validation.action_required ??
              'Build failed — the project does not compile with the current files. The preview the user sees is broken. Resolve the errors in `validation.errors` before responding.',
            validation,
          }
        }
        return { success: true, path: filePath, validation }
      }

      return { success: true, path: filePath }
    }

    return target.mainApiCall('PUT', `/api/projects/${projectId}/files`, sessionKey, {
      path: filePath,
      content,
    })
  }

  private async readFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    const filePath = String(input.path ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    if (!filePath) return { success: false, error: 'path is required' }

    if (this.hasRuntime) {
      const authorized = await this.requireRuntimeProject(target, projectId, sessionKey)
      if (!authorized.ok) return authorized.response

      try {
        const content = await this.modalFileIo!.readProjectFile(projectId, filePath)
        return { success: true, file: { path: filePath, content } }
      } catch {
        // Fall back to Storage
      }
    }

    const encodedPath = encodeURIComponent(filePath)
    return target.mainApiCall(
      'GET',
      `/api/projects/${projectId}/files?path=${encodedPath}`,
      sessionKey,
    )
  }

  private async deleteFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    const filePath = String(input.path ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    if (!filePath) return { success: false, error: 'path is required' }

    if (this.hasRuntime) {
      const authorized = await this.requireRuntimeProject(target, projectId, sessionKey)
      if (!authorized.ok) return authorized.response
      const project = authorized.project

      await this.modalFileIo!.deleteProjectFile(projectId, filePath)

      const conversationId = sessionKey ? target.parseConversationId?.(sessionKey) : null
      if (conversationId && target.streamRegistry) {
        const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
        void target.streamRegistry.emitEvent(conversationId, 'file_deleted', {
          project_id: projectId,
          path: normalizedPath,
        })
      }

      if (project?.storage_path) {
        this.storageSync!.queueDelete(projectId, project.storage_path, filePath)
      }

      const existingFiles = await this.modalFileIo!.listProjectFiles(projectId)
      const userId = target.resolveUserId(sessionKey)
      if (project?.storage_path) {
        void this.storageSync!.queueManifestUpdate(projectId, userId, {
          files: filterManifestFiles(existingFiles),
        })
      }

      return { success: true, path: filePath }
    }

    return target.mainApiCall('DELETE', `/api/projects/${projectId}/files`, sessionKey, {
      path: filePath,
    })
  }

  private async listProjectFiles(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }

    if (this.hasRuntime) {
      const authorized = await this.requireRuntimeProject(target, projectId, sessionKey)
      if (!authorized.ok) return authorized.response

      const files = await this.modalFileIo!.listProjectFiles(projectId)
      return { success: true, files, entryPoint: 'App.tsx' }
    }

    return target.mainApiCall('GET', `/api/projects/${projectId}/files`, sessionKey)
  }

  private async updateProjectDeps(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    const dependencies =
      input.dependencies &&
      typeof input.dependencies === 'object' &&
      !Array.isArray(input.dependencies)
        ? input.dependencies
        : null
    if (!dependencies) return { success: false, error: 'dependencies is required' }

    const authorized = this.hasRuntime
      ? await this.requireRuntimeProject(target, projectId, sessionKey)
      : null
    if (authorized && !authorized.ok) return authorized.response

    const result = await target.mainApiCall('PATCH', `/api/projects/${projectId}`, sessionKey, {
      dependencies,
    })

    if (this.hasRuntime) {
      try {
        const existingPackage = await this.modalFileIo!.readProjectFile(projectId, 'package.json')
        let pkg: Record<string, unknown>
        try {
          pkg = JSON.parse(existingPackage) as Record<string, unknown>
        } catch {
          pkg = {}
        }
        pkg.dependencies = {
          ...((pkg.dependencies as Record<string, string>) ?? {}),
          ...(dependencies as Record<string, string>),
        }

        const nextContent = JSON.stringify(pkg, null, 2)
        await this.modalFileIo!.writeProjectFile(projectId, 'package.json', nextContent)

        const project = authorized?.ok ? authorized.project : null
        if (project?.storage_path) {
          this.storageSync!.queueUpsert(
            projectId,
            project.storage_path,
            'package.json',
            nextContent,
          )
        }

        void this.modalFileIo!.runInstall(projectId).catch(() => {})
      } catch {}
    }

    return result
  }

  private async importGitHubRepo(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const repoFullName = String(input.repo_full_name ?? input.repo ?? '').trim()
    if (!repoFullName) return { success: false, error: 'repo_full_name is required' }
    const conversationId = sessionKey ? target.parseConversationId(sessionKey) : null
    return target.mainApiCall('POST', '/api/projects/import/github', sessionKey, {
      repo_full_name: repoFullName,
      branch: typeof input.branch === 'string' ? input.branch : undefined,
      conversation_id: conversationId,
    })
  }

  private async getProjectLogs(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.getProjectLogs(target, input, sessionKey, this.getRuntimeContext())
  }

  private async validateProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.validateProject(target, input, sessionKey, this.getRuntimeContext())
  }

  private async restartProject(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    return this.runtimeActions.restartProject(
      target,
      input,
      sessionKey,
      onProgress,
      this.getRuntimeContext(),
    )
  }

  private async fetchProjectUrl(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.fetchProjectUrl(target, input, sessionKey, this.getRuntimeContext())
  }

  private async patchFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const projectId = String(input.project_id ?? '').trim()
    const filePath = String(input.path ?? '').trim()
    if (!projectId) return { success: false, error: 'project_id is required' }
    if (!filePath) return { success: false, error: 'path is required' }

    if (!this.hasRuntime) {
      return { success: false, error: 'Project runtime not available' }
    }

    const authorized = await this.requireRuntimeProject(target, projectId, sessionKey)
    if (!authorized.ok) return authorized.response
    const project = authorized.project

    let existing = ''
    try {
      existing = await this.modalFileIo!.readProjectFile(projectId, filePath)
    } catch {
      return { success: false, error: `File not found: ${filePath}` }
    }

    const findStr = typeof input.find === 'string' ? input.find : undefined
    const replaceStr = typeof input.replace === 'string' ? input.replace : undefined

    if (findStr !== undefined && replaceStr !== undefined) {
      if (!existing.includes(findStr)) {
        return { success: false, error: 'find string not found in file' }
      }
      const updated = existing.replace(findStr, replaceStr)
      await this.modalFileIo!.writeProjectFile(projectId, filePath, updated)

      if (project?.storage_path) {
        this.storageSync!.queueUpsert(projectId, project.storage_path, filePath, updated)
      }

      return { success: true, path: filePath }
    }

    if (typeof input.content === 'string') {
      return this.upsertFile(target, input, sessionKey)
    }

    return { success: false, error: 'patch_file requires either (find + replace) or content' }
  }

  private async searchProjectFiles(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.searchProjectFiles(
      target,
      input,
      sessionKey,
      this.getRuntimeContext(),
    )
  }

  private async listProjectDirectory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.listProjectDirectory(
      target,
      input,
      sessionKey,
      this.getRuntimeContext(),
    )
  }

  private async getProjectErrors(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.runtimeActions.getProjectErrors(target, input, sessionKey, this.getRuntimeContext())
  }

  private async getProjectMeta(
    target: Record<string, any>,
    projectId: string,
    sessionKey?: string,
  ): Promise<ProjectMeta | null> {
    try {
      const result = await target.mainApiCall('GET', `/api/projects/${projectId}`, sessionKey)
      if (result && typeof result === 'object' && 'project' in result) {
        return (result as any).project
      }
      return result as any
    } catch {
      return null
    }
  }
}
