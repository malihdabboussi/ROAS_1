import { HttpException, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { VercelDeployService } from '../../projects/services/vercel-deploy.service'
import { DOMAINS_ERRORS } from '../config/domains-errors.config'
import { ConnectProjectDto } from '../dto/connect-project.dto'
import { DisconnectProjectDto } from '../dto/disconnect-project.dto'
import { VercelIntegration } from '../integrations/vercel.integration'
import { DomainsRepository } from '../repositories/domains.repository'
import { ConnectProjectResponse, DisconnectProjectResponse } from '../types/domains.types'

@Injectable()
export class DomainProjectConnectionService {
  private readonly logger = new Logger(DomainProjectConnectionService.name)

  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly vercelDeploy: VercelDeployService,
    private readonly vercelIntegration: VercelIntegration,
  ) {}

  async connectToProject(
    supabase: SupabaseClient,
    userId: string,
    dto: ConnectProjectDto,
  ): Promise<ConnectProjectResponse> {
    const { domain_id, project_id } = dto
    void userId

    try {
      const { data: domain, error: domainError } = await this.domainsRepository.findById(
        supabase,
        domain_id,
      )

      if (domainError || !domain) {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.httpStatus,
        )
      }

      const { data: project, error: projectError } =
        await this.domainsRepository.getProjectForDomainConnection(supabase, project_id)

      if (projectError || !project) {
        throw new HttpException(
          DOMAINS_ERRORS.PROJECT_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.PROJECT_NOT_FOUND.httpStatus,
        )
      }

      if (!project.vercel_project_id) {
        throw new HttpException(
          'Project must be published at least once before connecting a custom domain',
          400,
        )
      }

      const domainName = domain.domain_name

      await this.vercelIntegration.removeDomain(domainName).catch((err) => {
        this.logger.warn(`Failed to remove ${domainName} from funnels project (continuing): ${err}`)
      })

      const addResult = await this.vercelDeploy.addDomainToProject(
        project.vercel_project_id,
        domainName,
      )
      if (!addResult.success) {
        await this.vercelIntegration.addDomain(domainName).catch(() => {})
        throw new HttpException(
          addResult.error ?? DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
          DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
        )
      }

      const publishedUrl = project.is_published ? `https://${domainName}` : null

      const { error: updateError } = await this.domainsRepository.updateProjectDomainConnection(
        supabase,
        project_id,
        {
          domain_id,
          ...(publishedUrl ? { published_url: publishedUrl } : {}),
        },
      )

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      return {
        success: true,
        domain,
        connected: true,
        project: { id: project.id, name: project.name },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to connect domain to project', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async disconnectFromProject(
    supabase: SupabaseClient,
    userId: string,
    dto: DisconnectProjectDto,
  ): Promise<DisconnectProjectResponse> {
    const { project_id } = dto
    void userId

    try {
      const { data: project, error: projectError } =
        await this.domainsRepository.getProjectForDomainConnection(supabase, project_id)

      if (projectError || !project) {
        throw new HttpException(
          DOMAINS_ERRORS.PROJECT_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.PROJECT_NOT_FOUND.httpStatus,
        )
      }

      const { data: currentRow } = await this.domainsRepository.getProjectDomainId(
        supabase,
        project_id,
      )

      if (currentRow?.domain_id && project.vercel_project_id) {
        const { data: domainRow } = await this.domainsRepository.findById(
          supabase,
          currentRow.domain_id,
        )
        if (domainRow?.domain_name) {
          await this.vercelDeploy
            .removeDomainFromProject(project.vercel_project_id, domainRow.domain_name)
            .catch((err) => {
              this.logger.warn(
                `Failed to remove ${domainRow.domain_name} from project Vercel: ${err}`,
              )
            })

          await this.vercelIntegration.addDomain(domainRow.domain_name).catch((err) => {
            this.logger.warn(
              `Failed to restore ${domainRow.domain_name} to funnels project: ${err}`,
            )
          })
        }
      }

      const APPS_DOMAIN_SUFFIX = process.env.APPS_DOMAIN_SUFFIX || '-app.govibey.com'
      const publishedUrl =
        project.is_published && project.slug ? `https://${project.slug}${APPS_DOMAIN_SUFFIX}` : null

      const { error: updateError } = await this.domainsRepository.updateProjectDomainConnection(
        supabase,
        project_id,
        {
          domain_id: null,
          published_url: publishedUrl,
        },
      )

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      return {
        success: true,
        disconnected: true,
        project: { id: project.id, name: project.name },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to disconnect domain from project', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }
}
