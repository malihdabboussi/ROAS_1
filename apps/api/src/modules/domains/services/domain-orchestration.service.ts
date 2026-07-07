import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { DOMAINS_ERRORS } from '../config/domains-errors.config'
import { GenerateSubdomainDto } from '../dto/generate-subdomain.dto'
import { CloudflareIntegration } from '../integrations/cloudflare.integration'
import { VercelIntegration } from '../integrations/vercel.integration'
import { DomainsRepository } from '../repositories/domains.repository'
import { GenerateSubdomainResponse } from '../types/domains.types'

@Injectable()
export class DomainOrchestrationService {
  private readonly logger = new Logger(DomainOrchestrationService.name)
  private readonly VERCEL_FUNNELS_PROJECT_ID: string
  private readonly WAIT_FOR_SSL: boolean

  constructor(
    private readonly configService: ConfigService,
    private readonly domainsRepository: DomainsRepository,
    private readonly vercelIntegration: VercelIntegration,
    private readonly cloudflareIntegration: CloudflareIntegration,
  ) {
    this.VERCEL_FUNNELS_PROJECT_ID =
      this.configService.get<string>('VERCEL_FUNNELS_PROJECT_ID') || ''
    this.WAIT_FOR_SSL = this.configService.get<string>('WAIT_FOR_SSL') === 'true'
  }

  /**
   * Generate and setup subdomain for user (called from controller)
   */
  async generateSubdomain(
    supabase: SupabaseClient,
    userId: string,
    dto: GenerateSubdomainDto,
  ): Promise<GenerateSubdomainResponse> {
    const { preferred_username } = dto
    const environment: 'production' | 'staging' = 'production'

    try {
      // Check if user already has a generated subdomain
      const { data: existingDomain } = await this.domainsRepository.findGeneratedDomain(
        supabase,
        userId,
        environment,
      )

      if (existingDomain) {
        throw new HttpException(
          DOMAINS_ERRORS.SUBDOMAIN_ALREADY_EXISTS.userMessage,
          DOMAINS_ERRORS.SUBDOMAIN_ALREADY_EXISTS.httpStatus,
        )
      }

      // Generate subdomain
      const subdomainResult = await this.generateUserSubdomain(
        supabase,
        userId,
        preferred_username,
        environment,
      )

      if (!subdomainResult.success || !subdomainResult.subdomain) {
        throw new HttpException(
          subdomainResult.error || DOMAINS_ERRORS.ADD_DOMAIN_FAILED.userMessage,
          500,
        )
      }

      const fullDomain = subdomainResult.subdomain

      // Add domain to Vercel
      const vercelResult = await this.vercelIntegration.addDomain(fullDomain, environment)
      if (!vercelResult.success) {
        throw new HttpException(`Vercel setup failed: ${vercelResult.error}`, 500)
      }

      // Get DNS config from Vercel
      const configResult = await this.vercelIntegration.getDomainConfiguration(fullDomain)
      if (!configResult.success || !configResult.verification_records?.[0]) {
        await this.vercelIntegration.removeDomain(fullDomain)
        throw new HttpException(`DNS configuration failed: ${configResult.error}`, 500)
      }

      const vercelTarget = configResult.verification_records[0].value
      const subdomain = fullDomain.split('.')[0]

      // Add CNAME to Cloudflare
      const cfResult = await this.cloudflareIntegration.addCNAME(subdomain, vercelTarget)
      if (!cfResult.success) {
        await this.vercelIntegration.removeDomain(fullDomain)
        throw new HttpException(`Cloudflare setup failed: ${cfResult.error}`, 500)
      }

      // Store in database
      const { data: newDomain, error: insertError } = await this.domainsRepository.create(
        supabase,
        {
          domain_name: fullDomain,
          user_id: userId,
          vercel_project_id: this.VERCEL_FUNNELS_PROJECT_ID,
          vercel_domain_response: vercelResult.data || null,
          status: 'verified',
          verification_records: configResult.verification_records || null,
          last_verification_check: new Date().toISOString(),
          domain_type: 'generated',
          environment,
        },
      )

      if (insertError) {
        await this.vercelIntegration.removeDomain(fullDomain)
        if (cfResult.record?.id) {
          await this.cloudflareIntegration.removeCNAME(cfResult.record.id)
        }
        throw new HttpException(
          DOMAINS_ERRORS.DB_INSERT_FAILED.userMessage,
          DOMAINS_ERRORS.DB_INSERT_FAILED.httpStatus,
        )
      }

      this.logger.log(`Subdomain setup complete: ${fullDomain}`)

      if (this.WAIT_FOR_SSL) {
        await this.vercelIntegration.waitForSSLReady(fullDomain, 5)
      }

      return { success: true, domain: newDomain! }
    } catch (error) {
      if (error instanceof HttpException) throw error

      this.logger.error('Subdomain setup failed:', error)
      throw new HttpException(
        DOMAINS_ERRORS.ADD_DOMAIN_FAILED.userMessage,
        DOMAINS_ERRORS.ADD_DOMAIN_FAILED.httpStatus,
      )
    }
  }

  /**
   * Ensure a user has a subdomain. Creates one if not.
   * Called during funnel publish flow.
   */
  async ensureUserSubdomain(
    supabase: SupabaseClient,
    userId: string,
    preferredUsername?: string,
  ): Promise<GenerateSubdomainResponse> {
    const existing = await this.getUserDomain(supabase, userId, 'production')
    if (existing) {
      return { success: true, domain: existing }
    }

    return this.generateSubdomain(supabase, userId, {
      preferred_username: preferredUsername,
    })
  }

  /**
   * Get user's generated domain (if exists)
   */
  async getUserDomain(
    supabase: SupabaseClient,
    userId: string,
    environment?: 'production' | 'staging',
  ) {
    const { data } = await this.domainsRepository.findGeneratedDomain(supabase, userId, environment)
    return data
  }

  /**
   * Generate unique subdomain for user
   */
  private async generateUserSubdomain(
    supabase: SupabaseClient,
    userId: string,
    username?: string,
    environment: 'production' | 'staging' = 'production',
  ): Promise<{ success: boolean; subdomain?: string; error?: string }> {
    try {
      const baseDomain = this.cloudflareIntegration.getBaseDomain()

      let subdomain = ''
      if (username && /^[a-z0-9-]+$/.test(username) && username.length >= 3) {
        subdomain = username.toLowerCase()
      } else {
        const shortId = userId.replace(/-/g, '').slice(0, 8)
        const randomSuffix = Math.random().toString(36).slice(2, 5)
        subdomain = `user-${shortId}-${randomSuffix}`
      }

      if (environment === 'staging') {
        subdomain = `${subdomain}-staging`
      }

      const fullDomain = `${subdomain}.${baseDomain}`

      // Check uniqueness
      const { data: existingDomain } = await this.domainsRepository.existsByDomainName(
        supabase,
        fullDomain,
      )

      if (existingDomain) {
        const extra = Math.random().toString(36).slice(2, 6)
        subdomain = `${subdomain}-${extra}`
      }

      return { success: true, subdomain: `${subdomain}.${baseDomain}` }
    } catch {
      return { success: false, error: 'Failed to generate subdomain' }
    }
  }
}
