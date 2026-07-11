import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type RequestScope } from '@vibey/api-shared'
import { resolveAppsDomainSuffix } from '../../../lib/platform-defaults'
import { GitHubApiService } from '../../integrations/github/services/github-api.service'
import type {
  CreateProjectDto,
  ImportGitHubProjectDto,
  UpdateProjectDto,
} from '../dto/projects.dto'
import { ProjectsRepository, type ProjectRepoRow } from '../repositories/projects.repository'
import {
  getNextSpacesStarterFiles,
  getNextSpacesStarterPackageJson,
  STARTER_VERSION,
} from '../starter/next-spaces-starter'
import {
  detectContentType,
  getManifestFiles,
  normalizeRelativePath,
  parseDependencies,
  withManifestFile,
} from './project-file-manifest'
import { ProjectPublishService } from './project-publish.service'
import { VercelDeployService } from './vercel-deploy.service'

const APPS_DOMAIN_SUFFIX = resolveAppsDomainSuffix()

type GitHubFileEntry = { path: string; content: string }

@Injectable()
export class ProjectsService {
  constructor(
    private readonly githubApi: GitHubApiService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly vercelDeploy: VercelDeployService,
    private readonly projectPublishService: ProjectPublishService,
  ) {}

  async listProjects(supabase: SupabaseClient, scope: RequestScope): Promise<ProjectRepoRow[]> {
    return this.projectsRepository.listProjects(supabase, scope)
  }

  async createProject(
    supabase: SupabaseClient,
    userId: string,
    payload: CreateProjectDto,
    orgId?: string | null,
  ): Promise<ProjectRepoRow> {
    const projectId = crypto.randomUUID()
    const storagePath = `${userId}/${projectId}`

    const manifestFromPayload = getManifestFiles(
      (payload.manifest ?? {}) as Record<string, unknown>,
    )
    const seedStarter = manifestFromPayload.length === 0

    let manifest: Record<string, unknown>
    let dependencies: Record<string, string>
    let entry_point: string
    let deploy_status: string | undefined

    if (seedStarter) {
      const starterFiles = getNextSpacesStarterFiles()
      const uploadedPaths: string[] = []
      for (const file of starterFiles) {
        const relativePath = normalizeRelativePath(file.path)
        const objectPath = `${storagePath}/${relativePath}`
        await this.projectsRepository.uploadProjectStorageObject(
          supabase,
          objectPath,
          file.content,
          detectContentType(relativePath),
        )
        uploadedPaths.push(relativePath)
      }
      manifest = {
        files: uploadedPaths.sort((a, b) => a.localeCompare(b)),
        starter_version: STARTER_VERSION,
      }
      dependencies = parseDependencies(getNextSpacesStarterPackageJson())
      entry_point = 'app/page.tsx'
      deploy_status = 'running'
    } else {
      manifest = (payload.manifest ?? { files: manifestFromPayload }) as Record<string, unknown>
      dependencies = payload.dependencies ?? {}
      entry_point = payload.entry_point ?? 'src/App.tsx'
    }

    const insertRow: Record<string, unknown> = {
      id: projectId,
      user_id: userId,
      conversation_id: payload.conversation_id ?? null,
      name: payload.name.trim(),
      description: payload.description ?? null,
      storage_path: storagePath,
      entry_point,
      dependencies,
      manifest,
      source: 'agent',
      source_meta: {},
      status: 'ready',
      org_id: orgId ?? null,
    }
    if (deploy_status) insertRow.deploy_status = deploy_status

    return this.projectsRepository.insertProjectRepo(supabase, insertRow)
  }

  async getProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<ProjectRepoRow> {
    return this.projectsRepository.getProjectOwned(supabase, userId, projectId, orgId)
  }

  async updateProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    payload: UpdateProjectDto,
    orgId?: string | null,
  ): Promise<ProjectRepoRow> {
    await this.projectsRepository.getProjectOwned(supabase, userId, projectId, orgId)
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (payload.name) patch.name = payload.name
    if (payload.description !== undefined) patch.description = payload.description
    if (payload.entry_point) patch.entry_point = payload.entry_point
    if (payload.dependencies) patch.dependencies = payload.dependencies
    if (payload.manifest) patch.manifest = payload.manifest
    if (payload.status) patch.status = payload.status
    if (payload.deploy_status) patch.deploy_status = payload.deploy_status
    if (payload.deploy_error !== undefined) patch.deploy_error = payload.deploy_error
    if (payload.last_deployed_at !== undefined) patch.last_deployed_at = payload.last_deployed_at

    return this.projectsRepository.updateProjectRepo(supabase, userId, projectId, patch)
  }

  async deleteProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<void> {
    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    const projectAny = project as Record<string, unknown>

    const vercelDeploymentId = projectAny.vercel_deployment_id as string | null
    const vercelProjectId = projectAny.vercel_project_id as string | null
    const slug = projectAny.slug as string | null

    if (this.vercelDeploy.isConfigured) {
      if (vercelProjectId && slug) {
        await this.vercelDeploy
          .removeDomainFromProject(vercelProjectId, `${slug}${APPS_DOMAIN_SUFFIX}`)
          .catch(() => {})
      }
      if (vercelDeploymentId) {
        await this.vercelDeploy.deleteDeployment(vercelDeploymentId).catch(() => {})
      }
      if (vercelProjectId) {
        await this.vercelDeploy.deleteProject(vercelProjectId).catch(() => {})
      }
    }

    const files = getManifestFiles(project.manifest)
    if (files.length > 0) {
      const storagePaths = files.map((relativePath) => `${project.storage_path}/${relativePath}`)
      await this.projectsRepository.removeProjectStorageObjects(supabase, storagePaths)
    }

    await this.projectsRepository.deleteProjectRepo(supabase, userId, projectId)
  }

  async listProjectFiles(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<{ files: string[]; entryPoint: string }> {
    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    return { files: getManifestFiles(project.manifest), entryPoint: project.entry_point }
  }

  async readProjectFile(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    rawPath: string,
    orgId?: string | null,
  ): Promise<{ path: string; content: string }> {
    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    const relativePath = normalizeRelativePath(rawPath)
    const storagePath = `${project.storage_path}/${relativePath}`
    const content = await this.projectsRepository.downloadProjectStorageText(supabase, storagePath)
    return { path: relativePath, content }
  }

  async upsertProjectFile(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    rawPath: string,
    content: string,
    orgId?: string | null,
  ): Promise<{ path: string }> {
    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    const relativePath = normalizeRelativePath(rawPath)
    const storagePath = `${project.storage_path}/${relativePath}`
    await this.projectsRepository.uploadProjectStorageObject(
      supabase,
      storagePath,
      content,
      detectContentType(relativePath),
    )

    const nextManifest = withManifestFile(project.manifest, relativePath, true)
    await this.projectsRepository.updateProjectManifest(supabase, userId, projectId, nextManifest)
    return { path: relativePath }
  }

  async deleteProjectFile(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    rawPath: string,
    orgId?: string | null,
  ): Promise<{ path: string }> {
    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    const relativePath = normalizeRelativePath(rawPath)
    const storagePath = `${project.storage_path}/${relativePath}`
    await this.projectsRepository.removeProjectStorageObjects(supabase, [storagePath])

    const nextManifest = withManifestFile(project.manifest, relativePath, false)
    await this.projectsRepository.updateProjectManifest(supabase, userId, projectId, nextManifest)
    return { path: relativePath }
  }

  async importFromGitHub(
    supabase: SupabaseClient,
    userId: string,
    payload: ImportGitHubProjectDto,
    orgId?: string | null,
  ): Promise<ProjectRepoRow> {
    const [owner, repo] = payload.repo_full_name.split('/')
    if (!owner || !repo) throw new Error('invalid_repo_full_name')

    // Verifies repo access and connection up-front.
    await this.githubApi.getRepoContents(supabase, userId, owner, repo, '', payload.branch)

    const projectId = crypto.randomUUID()
    const storagePath = `${userId}/${projectId}`

    const inserted = await this.projectsRepository.insertProjectRepo(supabase, {
      id: projectId,
      user_id: userId,
      conversation_id: payload.conversation_id ?? null,
      name: repo,
      description: `Imported from ${owner}/${repo}`,
      storage_path: storagePath,
      entry_point: 'src/App.tsx',
      dependencies: {},
      manifest: { files: [] },
      source: 'github',
      source_meta: { repo: payload.repo_full_name, branch: payload.branch ?? null },
      status: 'building',
      org_id: orgId ?? null,
    })

    const files = await this.collectGitHubFiles(supabase, userId, owner, repo, '', payload.branch)
    const uploadedPaths: string[] = []
    for (const file of files) {
      const relativePath = normalizeRelativePath(file.path)
      const fullPath = `${storagePath}/${relativePath}`
      await this.projectsRepository
        .uploadProjectStorageObject(
          supabase,
          fullPath,
          file.content,
          detectContentType(relativePath),
        )
        .then(() => uploadedPaths.push(relativePath))
        .catch(() => {})
    }

    const packageJson = files.find((file) => file.path === 'package.json')
    const dependencies = parseDependencies(packageJson?.content ?? '')
    const defaultEntryPoint = uploadedPaths.includes('src/App.tsx')
      ? 'src/App.tsx'
      : uploadedPaths.includes('App.tsx')
        ? 'App.tsx'
        : (uploadedPaths[0] ?? 'src/App.tsx')

    return this.projectsRepository.updateProjectRepo(supabase, userId, inserted.id, {
      storage_path: storagePath,
      entry_point: defaultEntryPoint,
      dependencies,
      manifest: { files: uploadedPaths },
      source_meta: {
        repo: payload.repo_full_name,
        branch: payload.branch ?? null,
        imported_at: new Date().toISOString(),
      },
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
  }

  async publishProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<{ slug: string; publish_status: string }> {
    return this.projectPublishService.publishProject(supabase, userId, projectId, orgId)
  }

  private async runPublishPipeline(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    slug: string,
  ): Promise<void> {
    return this.projectPublishService.runPublishPipeline(supabase, userId, projectId, slug)
  }

  async unpublishProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.projectPublishService.unpublishProject(supabase, userId, projectId, orgId)
  }

  private async collectGitHubFiles(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFileEntry[]> {
    const node = await this.githubApi.getRepoContents(supabase, userId, owner, repo, path, ref)
    if (!Array.isArray(node)) {
      if (node && typeof node === 'object' && (node as { type?: string }).type === 'file') {
        const fileNode = node as { path?: string; content?: string; encoding?: string }
        if (!fileNode.path) return []
        if (fileNode.encoding === 'base64' && typeof fileNode.content === 'string') {
          return [
            {
              path: fileNode.path,
              content: Buffer.from(fileNode.content, 'base64').toString('utf8'),
            },
          ]
        }
      }
      return []
    }

    const files: GitHubFileEntry[] = []
    for (const entry of node) {
      const item = entry as { type?: string; path?: string; size?: number }
      if (!item.path || !item.type) continue
      if (item.type === 'dir') {
        const nested = await this.collectGitHubFiles(supabase, userId, owner, repo, item.path, ref)
        files.push(...nested)
        continue
      }
      if (item.type !== 'file') continue
      if (typeof item.size === 'number' && item.size > 1_000_000) continue

      const fileNode = await this.githubApi.getRepoContents(
        supabase,
        userId,
        owner,
        repo,
        item.path,
        ref,
      )
      if (!fileNode || Array.isArray(fileNode)) continue
      const details = fileNode as { content?: string; encoding?: string; path?: string }
      if (details.encoding !== 'base64' || typeof details.content !== 'string' || !details.path)
        continue
      files.push({
        path: details.path,
        content: Buffer.from(details.content, 'base64').toString('utf8'),
      })
    }

    return files
  }
}
