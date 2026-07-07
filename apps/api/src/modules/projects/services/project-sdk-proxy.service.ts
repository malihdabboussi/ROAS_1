import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SandboxService } from '../../sandboxes/services/sandbox.service'
import { ProjectsRepository } from '../repositories/projects.repository'

export type ProjectSdkProxyTarget =
  | { status: 'service_unavailable' }
  | { status: 'not_found' }
  | { status: 'sandbox_unavailable' }
  | { status: 'ready'; supabase: SupabaseClient; targetBaseUrl: string }

@Injectable()
export class ProjectSdkProxyService {
  private readonly logger = new Logger(ProjectSdkProxyService.name)

  constructor(
    private readonly sandboxService: SandboxService,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async resolveTarget(projectId: string): Promise<ProjectSdkProxyTarget> {
    const supabase = this.projectsRepository.createServiceClientFromEnv()
    if (!supabase) {
      return { status: 'service_unavailable' }
    }

    const project = await this.projectsRepository.findProjectId(supabase, projectId)
    if (!project) {
      return { status: 'not_found' }
    }

    try {
      const result = await this.sandboxService.ensureRunning(supabase, projectId)
      return { status: 'ready', supabase, targetBaseUrl: result.tunnelUrl }
    } catch (err) {
      this.logger.error(`[SdkProxy] Sandbox start failed for project ${projectId}: ${err}`)
      return { status: 'sandbox_unavailable' }
    }
  }

  touchLastDeployedAt(supabase: SupabaseClient, projectId: string): void {
    this.projectsRepository.touchLastDeployedAt(supabase, projectId)
  }
}
