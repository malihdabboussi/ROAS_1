import { HttpException, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { DOMAINS_ERRORS } from '../config/domains-errors.config'
import { ConnectDomainDto } from '../dto/connect-domain.dto'
import { ConnectFunnelDto } from '../dto/connect-funnel.dto'
import { ConnectPresentationDto } from '../dto/connect-presentation.dto'
import { ConnectProjectDto } from '../dto/connect-project.dto'
import { DisconnectFunnelDto } from '../dto/disconnect-funnel.dto'
import { DisconnectPresentationDto } from '../dto/disconnect-presentation.dto'
import { DisconnectProjectDto } from '../dto/disconnect-project.dto'
import { DomainsCacheRepository } from '../repositories/domains-cache.repository'
import { DomainsRepository } from '../repositories/domains.repository'
import {
  ConnectDomainResponse,
  ConnectFunnelResponse,
  ConnectPresentationResponse,
  ConnectProjectResponse,
  DisconnectFunnelResponse,
  DisconnectPresentationResponse,
  DisconnectProjectResponse,
} from '../types/domains.types'
import { DomainProjectConnectionService } from './domain-project-connection.service'

@Injectable()
export class DomainConnectionService {
  private readonly logger = new Logger(DomainConnectionService.name)

  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly domainsCacheRepository: DomainsCacheRepository,
    private readonly domainProjectConnectionService: DomainProjectConnectionService,
  ) {}

  async connectToLandingPage(
    supabase: SupabaseClient,
    userId: string,
    dto: ConnectDomainDto,
  ): Promise<ConnectDomainResponse> {
    const { domain_id, landing_page_id } = dto

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

      let landingPage: { id: string; slug: string } | null = null
      if (landing_page_id) {
        const { data, error: landingError } = await this.domainsRepository.getLandingPage(
          supabase,
          landing_page_id,
        )

        if (landingError || !data) {
          throw new HttpException(
            DOMAINS_ERRORS.LANDING_PAGE_NOT_FOUND.userMessage,
            DOMAINS_ERRORS.LANDING_PAGE_NOT_FOUND.httpStatus,
          )
        }
        landingPage = data
      }

      // Update domain connection
      const { data: updatedDomain, error: updateError } = await this.domainsRepository.update(
        supabase,
        domain_id,
        {
          landing_page_id: landing_page_id || null,
        },
      )

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      // Update cache
      const domainName = domain.domain_name
      if (landing_page_id && landingPage && domain.status === 'verified') {
        await this.domainsCacheRepository.cacheDomain(
          supabase,
          domainName,
          landingPage.slug,
          userId,
        )
      } else {
        await this.domainsCacheRepository.removeCachedDomain(supabase, domainName)
      }

      return {
        success: true,
        domain: updatedDomain || domain,
        connected: !!landing_page_id,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to connect domain to landing page', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async connectToFunnel(
    supabase: SupabaseClient,
    userId: string,
    dto: ConnectFunnelDto,
  ): Promise<ConnectFunnelResponse> {
    const { domain_id, funnel_id } = dto

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

      const { data: funnel, error: funnelError } =
        await this.domainsRepository.getFunnelForDomainConnection(supabase, funnel_id)

      if (funnelError || !funnel) {
        throw new HttpException(
          DOMAINS_ERRORS.FUNNEL_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.FUNNEL_NOT_FOUND.httpStatus,
        )
      }

      const domainName = domain.domain_name
      const publishedUrl =
        funnel.status === 'published' && funnel.slug ? `https://${domainName}/${funnel.slug}` : null

      const { error: funnelUpdateError } =
        await this.domainsRepository.updateFunnelDomainConnection(supabase, funnel_id, {
          domain_id,
          ...(publishedUrl ? { published_url: publishedUrl } : {}),
        })

      if (funnelUpdateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      return {
        success: true,
        domain,
        connected: true,
        funnel: { id: funnel.id, title: funnel.title ?? funnel.name },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to connect domain to funnel', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async disconnectFromFunnel(
    supabase: SupabaseClient,
    userId: string,
    dto: DisconnectFunnelDto,
  ): Promise<DisconnectFunnelResponse> {
    const { funnel_id } = dto

    try {
      const { data: funnel, error: funnelError } =
        await this.domainsRepository.getFunnelForDomainConnection(supabase, funnel_id)

      if (funnelError || !funnel) {
        throw new HttpException(
          DOMAINS_ERRORS.FUNNEL_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.FUNNEL_NOT_FOUND.httpStatus,
        )
      }

      const { data: generatedDomain, error: generatedError } =
        await this.domainsRepository.findGeneratedDomain(supabase, userId)

      if (generatedError || !generatedDomain?.domain_name) {
        throw new HttpException(
          DOMAINS_ERRORS.GENERATED_DOMAIN_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.GENERATED_DOMAIN_NOT_FOUND.httpStatus,
        )
      }

      const publishedUrl =
        funnel.status === 'published' && funnel.slug
          ? `https://${generatedDomain.domain_name}/${funnel.slug}`
          : null

      const { error: updateError } = await this.domainsRepository.updateFunnelDomainConnection(
        supabase,
        funnel_id,
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
        funnel: { id: funnel.id, title: funnel.title ?? funnel.name },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to disconnect domain from funnel', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async connectToPresentation(
    supabase: SupabaseClient,
    userId: string,
    dto: ConnectPresentationDto,
  ): Promise<ConnectPresentationResponse> {
    const { domain_id, presentation_id } = dto

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

      const { data: presentation, error: lmError } =
        await this.domainsRepository.getPresentationForDomainConnection(supabase, presentation_id)

      if (lmError || !presentation) {
        throw new HttpException(
          DOMAINS_ERRORS.PRESENTATION_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.PRESENTATION_NOT_FOUND.httpStatus,
        )
      }

      const domainName = domain.domain_name
      const publishedUrl =
        presentation.status === 'published' && presentation.slug
          ? `https://${domainName}/lm/${presentation.slug}`
          : null

      const { error: updateError } =
        await this.domainsRepository.updatePresentationDomainConnection(supabase, presentation_id, {
          domain_id,
          ...(publishedUrl ? { published_url: publishedUrl } : {}),
        })

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      void userId

      return {
        success: true,
        domain,
        connected: true,
        presentation: { id: presentation.id, name: presentation.name ?? 'Presentation' },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to connect domain to presentation', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async disconnectFromPresentation(
    supabase: SupabaseClient,
    userId: string,
    dto: DisconnectPresentationDto,
  ): Promise<DisconnectPresentationResponse> {
    const { presentation_id } = dto

    try {
      const { data: presentation, error: lmError } =
        await this.domainsRepository.getPresentationForDomainConnection(supabase, presentation_id)

      if (lmError || !presentation) {
        throw new HttpException(
          DOMAINS_ERRORS.PRESENTATION_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.PRESENTATION_NOT_FOUND.httpStatus,
        )
      }

      const { data: generatedDomain, error: generatedError } =
        await this.domainsRepository.findGeneratedDomain(supabase, userId)

      if (generatedError || !generatedDomain?.domain_name) {
        throw new HttpException(
          DOMAINS_ERRORS.GENERATED_DOMAIN_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.GENERATED_DOMAIN_NOT_FOUND.httpStatus,
        )
      }

      const publishedUrl =
        presentation.status === 'published' && presentation.slug
          ? `https://${generatedDomain.domain_name}/lm/${presentation.slug}`
          : null

      const { error: updateError } =
        await this.domainsRepository.updatePresentationDomainConnection(supabase, presentation_id, {
          domain_id: null,
          published_url: publishedUrl,
        })

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_UPDATE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_UPDATE_FAILED.httpStatus,
        )
      }

      return {
        success: true,
        disconnected: true,
        presentation: { id: presentation.id, name: presentation.name ?? 'Presentation' },
        published_url: publishedUrl,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to disconnect domain from presentation', error)
      throw new HttpException(
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.CONNECT_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async connectToProject(
    supabase: SupabaseClient,
    userId: string,
    dto: ConnectProjectDto,
  ): Promise<ConnectProjectResponse> {
    return this.domainProjectConnectionService.connectToProject(supabase, userId, dto)
  }

  async disconnectFromProject(
    supabase: SupabaseClient,
    userId: string,
    dto: DisconnectProjectDto,
  ): Promise<DisconnectProjectResponse> {
    return this.domainProjectConnectionService.disconnectFromProject(supabase, userId, dto)
  }
}
