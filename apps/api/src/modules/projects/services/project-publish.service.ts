import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveProjectSessionKey } from '@vibey/api-shared'
import { resolveAppsDomainSuffix, resolvePlatformApiUrl } from '../../../lib/platform-defaults'
import { ProjectsRepository } from '../repositories/projects.repository'
import { getManifestFiles } from './project-file-manifest'
import { VERCEL_PUBLISH_DEPLOY_WAIT_MS, VercelDeployService } from './vercel-deploy.service'

const APPS_DOMAIN_SUFFIX = resolveAppsDomainSuffix()
const PLATFORM_API_URL = resolvePlatformApiUrl()

@Injectable()
export class ProjectPublishService {
  private readonly logger = new Logger(ProjectPublishService.name)

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly vercelDeploy: VercelDeployService,
  ) {}

  async publishProject(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<{ slug: string; publish_status: string }> {
    if (!this.vercelDeploy.isConfigured) {
      throw new Error('Publishing is not available: VERCEL_TOKEN is not configured')
    }

    const project = await this.projectsRepository.getProjectOwned(
      supabase,
      userId,
      projectId,
      orgId,
    )
    const projectAny = project as Record<string, unknown>
    const currentPublishStatus = projectAny.publish_status as string | undefined

    let slug = projectAny.slug as string | null
    if (!slug) {
      slug = await this.generateUniqueSlug(project.name)
    }

    if (
      currentPublishStatus === 'draft' &&
      projectAny.vercel_project_id &&
      projectAny.vercel_deployment_id
    ) {
      const domain = `${slug}${APPS_DOMAIN_SUFFIX}`
      await this.vercelDeploy.addDomainToProject(projectAny.vercel_project_id as string, domain)

      await this.projectsRepository.updateProjectRepo(supabase, userId, projectId, {
        slug,
        is_published: true,
        publish_status: 'published',
        published_url: `https://${domain}`,
        publish_error: null,
        updated_at: new Date().toISOString(),
      })

      this.logger.log(`Re-published project ${projectId} from draft (instant)`)
      return { slug, publish_status: 'published' }
    }

    await this.projectsRepository.updateProjectRepo(supabase, userId, projectId, {
      slug,
      publish_status: 'building',
      publish_error: null,
      updated_at: new Date().toISOString(),
    })

    void this.runPublishPipeline(supabase, userId, projectId, slug)

    return { slug, publish_status: 'building' }
  }

  async runPublishPipeline(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    slug: string,
  ): Promise<void> {
    try {
      this.logger.log(`[Publish ${projectId}] Collecting source files from Storage...`)
      const files = await this.collectProjectSourceFilesForVercel(supabase, userId, projectId)

      await this.projectsRepository.updateProjectRepoById(supabase, projectId, {
        publish_status: 'deploying',
      })

      this.logger.log(
        `[Publish ${projectId}] Uploading ${files.size} files to Vercel (build on Vercel)...`,
      )

      const projectRow = await this.projectsRepository.getProjectPublishConfig(supabase, projectId)

      const vercelProject = await this.vercelDeploy.ensureVercelProject(
        slug,
        projectRow?.vercel_project_id ?? null,
      )
      if (vercelProject.error) throw new Error(vercelProject.error)

      const envVars: Record<string, string> = {
        VIBEY_API_URL: `${PLATFORM_API_URL}/api/sdk-proxy/${projectId}`,
        VIBEY_PROJECT_ID: projectId,
        VIBEY_SESSION_KEY: deriveProjectSessionKey(projectId, process.env.VIBEY_SESSION_KEY),
        NEXT_PUBLIC_VIBEY_PROJECT_ID: projectId,
      }

      if (projectRow?.supabase_api_url) {
        envVars.NEXT_PUBLIC_SUPABASE_URL = projectRow.supabase_api_url as string
      }
      if (projectRow?.supabase_anon_key) {
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = projectRow.supabase_anon_key as string
      }

      await this.vercelDeploy.setProjectEnvVars(vercelProject.projectId, envVars)

      const uploadedFiles = await this.vercelDeploy.uploadFiles(files)

      const deployment = await this.vercelDeploy.createDeployment(
        vercelProject.projectId,
        uploadedFiles,
        { slug, envVars },
      )
      if (!deployment.success) throw new Error(deployment.error ?? 'Deployment creation failed')

      const readyResult = await this.vercelDeploy.waitForDeployment(
        deployment.deploymentId!,
        VERCEL_PUBLISH_DEPLOY_WAIT_MS,
      )
      if (!readyResult.ready)
        throw new Error(readyResult.error ?? 'Deployment did not become ready')

      const deployUrl = readyResult.url ?? deployment.deploymentUrl!
      this.logger.log(`[Publish ${projectId}] Running health check on ${deployUrl}...`)
      const health = await this.vercelDeploy.healthCheck(deployUrl)
      if (!health.healthy) {
        const fixable = health.issues.filter((issue) => issue.autoFixable)
        const unfixable = health.issues.filter((issue) => !issue.autoFixable)
        if (unfixable.length > 0) {
          this.logger.warn(
            `[Publish ${projectId}] Health check found unfixable issues: ${unfixable
              .map((issue) => issue.message)
              .join('; ')}`,
          )
        }
        if (fixable.length > 0) {
          this.logger.warn(
            `[Publish ${projectId}] Health check found fixable issues: ${fixable
              .map((issue) => issue.message)
              .join('; ')}`,
          )
        }
      }

      const generatedDomain = `${slug}${APPS_DOMAIN_SUFFIX}`
      await this.vercelDeploy.addDomainToProject(vercelProject.projectId, generatedDomain)

      let published_url = `https://${generatedDomain}`

      if (projectRow?.domain_id) {
        const customDomainName = await this.projectsRepository.getDomainName(
          supabase,
          projectRow.domain_id,
        )

        if (customDomainName) {
          await this.vercelDeploy.addDomainToProject(vercelProject.projectId, customDomainName)
          published_url = `https://${customDomainName}`
        }
      }

      await this.projectsRepository.updateProjectRepoById(supabase, projectId, {
        is_published: true,
        publish_status: 'published',
        published_url,
        vercel_project_id: vercelProject.projectId,
        vercel_deployment_id: deployment.deploymentId,
        vercel_deployment_url: readyResult.url ?? deployment.deploymentUrl,
        publish_error: null,
        updated_at: new Date().toISOString(),
      })

      this.logger.log(`[Publish ${projectId}] Published -> ${published_url}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`[Publish ${projectId}] Failed: ${message}`)

      try {
        await this.projectsRepository.updateProjectRepoById(supabase, projectId, {
          publish_status: 'failed',
          publish_error: message.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
      } catch {}
    }
  }

  async unpublishProject(
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

    const vercelProjectId = projectAny.vercel_project_id as string | null
    const slug = projectAny.slug as string | null
    const domainId = projectAny.domain_id as string | null

    if (vercelProjectId && slug) {
      const domain = `${slug}${APPS_DOMAIN_SUFFIX}`
      await this.vercelDeploy.removeDomainFromProject(vercelProjectId, domain).catch(() => {})
    }

    if (vercelProjectId && domainId) {
      const domainName = await this.projectsRepository.getDomainName(supabase, domainId)

      if (domainName) {
        await this.vercelDeploy.removeDomainFromProject(vercelProjectId, domainName).catch(() => {})
      }
    }

    await this.projectsRepository.updateProjectRepo(supabase, userId, projectId, {
      is_published: false,
      publish_status: 'draft',
      published_url: null,
      domain_id: null,
      updated_at: new Date().toISOString(),
    })

    this.logger.log(`Unpublished project ${projectId} -> draft`)
  }

  private async collectProjectSourceFilesForVercel(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
  ): Promise<Map<string, Buffer>> {
    const project = await this.projectsRepository.getProjectSourceManifest(
      supabase,
      userId,
      projectId,
    )

    const paths = getManifestFiles(project.manifest as Record<string, unknown>)
    if (paths.length === 0) {
      throw new Error('No files in project manifest; sync files to Storage before publishing')
    }

    const normalizedPaths = new Set<string>()
    for (const p of paths) {
      const normalized = p.replace(/\\/g, '/').replace(/^\/+/, '').trim()
      if (!normalized || normalized.includes('..')) {
        throw new Error(`Invalid manifest path: ${p}`)
      }
      normalizedPaths.add(normalized)
    }

    if (!normalizedPaths.has('package.json')) {
      throw new Error('package.json is missing from project manifest; cannot deploy to Vercel')
    }

    const files = new Map<string, Buffer>()
    const prefix = project.storage_path as string

    for (const relativePath of Array.from(normalizedPaths).sort((a, b) => a.localeCompare(b))) {
      const objectPath = `${prefix}/${relativePath}`
      files.set(
        relativePath,
        await this.projectsRepository.downloadProjectStorageBuffer(
          supabase,
          objectPath,
          relativePath,
        ),
      )
    }

    return files
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'project'

    let slug = base
    let attempt = 0
    while (attempt < 20) {
      const exists = await this.projectsRepository.slugExists(slug)
      if (!exists) return slug
      attempt++
      slug = `${base}-${attempt}`
    }

    return `${base}-${Date.now().toString(36)}`
  }
}
