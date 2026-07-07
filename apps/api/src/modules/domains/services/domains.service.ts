import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { DOMAINS_ERRORS } from '../config/domains-errors.config'
import { AddDomainDto } from '../dto/add-domain.dto'
import { RemoveDomainDto } from '../dto/remove-domain.dto'
import { VercelIntegration } from '../integrations/vercel.integration'
import { DomainsCacheRepository } from '../repositories/domains-cache.repository'
import { DomainsRepository } from '../repositories/domains.repository'
import {
  AddDomainResponse,
  DomainConfigResponse,
  ListDomainsResponse,
  RemoveDomainResponse,
} from '../types/domains.types'

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name)
  private readonly VERCEL_FUNNELS_PROJECT_ID: string

  constructor(
    private readonly configService: ConfigService,
    private readonly domainsRepository: DomainsRepository,
    private readonly domainsCacheRepository: DomainsCacheRepository,
    private readonly vercelIntegration: VercelIntegration,
  ) {
    this.VERCEL_FUNNELS_PROJECT_ID =
      this.configService.get<string>('VERCEL_FUNNELS_PROJECT_ID') || ''
  }

  async listDomains(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<ListDomainsResponse> {
    try {
      const { data: domains, error: dbError } = await this.domainsRepository.findByUserId(
        supabase,
        userId,
        orgId,
      )

      if (dbError) {
        this.logger.error('Failed to fetch domains', { userId, dbError: dbError.message })
        throw new HttpException(
          DOMAINS_ERRORS.LOAD_DOMAINS_FAILED.userMessage,
          DOMAINS_ERRORS.LOAD_DOMAINS_FAILED.httpStatus,
        )
      }

      return { success: true, domains: domains || [] }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Unhandled error listing domains', error)
      throw new HttpException(
        DOMAINS_ERRORS.UNKNOWN_ERROR.userMessage,
        DOMAINS_ERRORS.UNKNOWN_ERROR.httpStatus,
      )
    }
  }

  async addDomain(
    supabase: SupabaseClient,
    userId: string,
    dto: AddDomainDto,
    orgId?: string | null,
  ): Promise<AddDomainResponse> {
    const { domain_name } = dto

    try {
      // Check if domain already exists
      const { data: existingDomain, error: checkError } =
        await this.domainsRepository.existsByDomainName(supabase, domain_name, orgId)

      if (checkError && checkError.code !== 'PGRST116') {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_CHECK_FAILED.userMessage,
          DOMAINS_ERRORS.DOMAIN_CHECK_FAILED.httpStatus,
        )
      }

      if (existingDomain) {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_ALREADY_EXISTS.userMessage,
          DOMAINS_ERRORS.DOMAIN_ALREADY_EXISTS.httpStatus,
        )
      }

      // Add to Vercel
      const vercelResult = await this.vercelIntegration.addDomain(domain_name)
      if (!vercelResult.success) {
        throw new HttpException(
          vercelResult.error || DOMAINS_ERRORS.ADD_DOMAIN_FAILED.userMessage,
          400,
        )
      }

      const initialStatus = vercelResult.data
        ? this.vercelIntegration.getDomainStatus(vercelResult.data)
        : 'pending'

      // Store in database
      const { data: newDomain, error: insertError } = await this.domainsRepository.create(
        supabase,
        {
          domain_name,
          user_id: userId,
          vercel_project_id: this.VERCEL_FUNNELS_PROJECT_ID,
          vercel_domain_response: vercelResult.data || null,
          status: initialStatus,
          verification_records: vercelResult.verification_records || null,
          last_verification_check: new Date().toISOString(),
          domain_type: 'custom',
        },
        orgId,
      )

      if (insertError) {
        await this.vercelIntegration.removeDomain(domain_name)
        throw new HttpException(
          DOMAINS_ERRORS.DB_INSERT_FAILED.userMessage,
          DOMAINS_ERRORS.DB_INSERT_FAILED.httpStatus,
        )
      }

      return {
        success: true,
        domain: newDomain!,
        verification_records: vercelResult.verification_records,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to add domain', error)
      throw new HttpException(
        DOMAINS_ERRORS.ADD_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.ADD_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  async removeDomain(
    supabase: SupabaseClient,
    userId: string,
    dto: RemoveDomainDto,
    orgId?: string | null,
  ): Promise<RemoveDomainResponse> {
    const { domain_id } = dto

    try {
      const { data: domain, error: domainError } = await this.domainsRepository.findById(
        supabase,
        domain_id,
        orgId,
      )

      if (domainError || !domain) {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.httpStatus,
        )
      }

      // Cannot delete generated base domain
      if (domain.domain_type === 'generated') {
        throw new HttpException(
          DOMAINS_ERRORS.GENERATED_DOMAIN_PROTECTED.userMessage,
          DOMAINS_ERRORS.GENERATED_DOMAIN_PROTECTED.httpStatus,
        )
      }

      // Cannot delete domain still connected to a funnel
      if (domain.funnel_id) {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_STILL_CONNECTED.userMessage,
          DOMAINS_ERRORS.DOMAIN_STILL_CONNECTED.httpStatus,
        )
      }

      const domainName = domain.domain_name

      // Remove from Vercel (best effort)
      const vercelResult = await this.vercelIntegration.removeDomain(domainName)
      if (!vercelResult.success) {
        this.logger.warn(`Failed to remove domain from Vercel (continuing): ${vercelResult.error}`)
      }

      // Remove from cache
      await this.domainsCacheRepository.removeCachedDomain(supabase, domainName)

      // Remove from database
      const { error: deleteError } = await this.domainsRepository.delete(supabase, domain_id, orgId)

      if (deleteError) {
        throw new HttpException(
          DOMAINS_ERRORS.DB_DELETE_FAILED.userMessage,
          DOMAINS_ERRORS.DB_DELETE_FAILED.httpStatus,
        )
      }

      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to remove domain', error)
      throw new HttpException(
        DOMAINS_ERRORS.UNKNOWN_ERROR.userMessage,
        DOMAINS_ERRORS.UNKNOWN_ERROR.httpStatus,
      )
    }
  }

  async getDomainConfig(
    supabase: SupabaseClient,
    userId: string,
    domainName: string,
    orgId?: string | null,
  ): Promise<DomainConfigResponse> {
    try {
      const { data: domainExists, error: domainError } =
        await this.domainsRepository.findByDomainName(supabase, domainName, orgId)

      if (!domainExists || domainError) {
        throw new HttpException(
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.userMessage,
          DOMAINS_ERRORS.DOMAIN_NOT_FOUND.httpStatus,
        )
      }

      const configResult = await this.vercelIntegration.getDomainConfiguration(domainName)

      if (!configResult.success) {
        throw new HttpException(
          configResult.error || DOMAINS_ERRORS.VERCEL_API_ERROR.userMessage,
          DOMAINS_ERRORS.VERCEL_API_ERROR.httpStatus,
        )
      }

      return {
        success: true,
        data: configResult.data,
        verification_records: configResult.verification_records || [],
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to get domain config', error)
      throw new HttpException(
        DOMAINS_ERRORS.UNKNOWN_ERROR.userMessage,
        DOMAINS_ERRORS.UNKNOWN_ERROR.httpStatus,
      )
    }
  }
}
