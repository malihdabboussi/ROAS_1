import { HttpException, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { DOMAINS_ERRORS } from '../config/domains-errors.config'
import { VerifyDomainDto } from '../dto/verify-domain.dto'
import { VercelIntegration } from '../integrations/vercel.integration'
import { DomainsCacheRepository } from '../repositories/domains-cache.repository'
import { DomainsRepository } from '../repositories/domains.repository'
import { DomainStatus, VerifyDomainResponse } from '../types/domains.types'

@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name)

  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly domainsCacheRepository: DomainsCacheRepository,
    private readonly vercelIntegration: VercelIntegration,
  ) {}

  async verifyDomain(
    supabase: SupabaseClient,
    userId: string,
    dto: VerifyDomainDto,
  ): Promise<VerifyDomainResponse> {
    const { domain_id } = dto

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

      // Verify with Vercel
      const vercelResult = await this.vercelIntegration.verifyDomain(domain.domain_name)
      if (!vercelResult.success) {
        throw new HttpException(vercelResult.error || DOMAINS_ERRORS.VERIFY_FAILED.userMessage, 400)
      }

      let newStatus: DomainStatus = this.vercelIntegration.getDomainStatus(vercelResult.data!)

      // If DNS verified, check SSL
      if (newStatus === 'dns_verified') {
        const sslCheck = await this.vercelIntegration.checkSSLCertificate(domain.domain_name)
        if (sslCheck.success) {
          newStatus = sslCheck.sslReady ? 'verified' : 'ssl_pending'
        }
      }

      // Update status in database
      const { error: updateError } = await this.domainsRepository.updateStatus(
        supabase,
        domain_id,
        newStatus,
        vercelResult.verification_records,
      )

      if (updateError) {
        throw new HttpException(
          DOMAINS_ERRORS.UPDATE_STATUS_FAILED.userMessage,
          DOMAINS_ERRORS.UPDATE_STATUS_FAILED.httpStatus,
        )
      }

      // Handle cache based on status change
      await this.updateCacheBasedOnStatus(supabase, domain, newStatus, userId)

      return {
        success: true,
        status: newStatus,
        verification_records: vercelResult.verification_records,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.error('Failed to verify domain', error)
      throw new HttpException(
        DOMAINS_ERRORS.VERIFY_FAILED.userMessage,
        DOMAINS_ERRORS.VERIFY_FAILED.httpStatus,
      )
    }
  }

  private async updateCacheBasedOnStatus(
    supabase: SupabaseClient,
    domain: any,
    newStatus: DomainStatus,
    userId: string,
  ): Promise<void> {
    const domainName = domain.domain_name

    if (newStatus === 'verified' && domain.status !== 'verified') {
      // Just became verified - cache if connected to landing page
      if (domain.landing_page_id) {
        const { data: landingPage } = await this.domainsRepository.getLandingPage(
          supabase,
          domain.landing_page_id,
        )
        if (landingPage) {
          await this.domainsCacheRepository.cacheDomain(
            supabase,
            domainName,
            landingPage.slug,
            userId,
          )
        }
      }
    } else if (newStatus !== 'verified' && domain.status === 'verified') {
      // No longer verified - remove from cache
      await this.domainsCacheRepository.removeCachedDomain(supabase, domainName)
    }
  }
}
