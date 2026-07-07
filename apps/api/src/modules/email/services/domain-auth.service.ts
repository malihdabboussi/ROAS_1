import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SendGridIntegration } from '../integrations/sendgrid.integration'
import { EmailDomainsRepository } from '../repositories/email-domains.repository'
import type { DnsRecord, DomainStatus, EmailDomain } from '../types/email.types'

@Injectable()
export class DomainAuthService {
  private readonly logger = new Logger(DomainAuthService.name)
  private readonly backendUrl: string

  constructor(
    private readonly sendgrid: SendGridIntegration,
    private readonly domainsRepository: EmailDomainsRepository,
    private readonly configService: ConfigService,
  ) {
    this.backendUrl =
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      'http://localhost:3001'
  }

  async addDomain(
    supabase: SupabaseClient,
    userId: string,
    domainName: string,
    subdomain?: string,
    isDefault = false,
    customDkimSelector?: string,
    orgId?: string | null,
  ): Promise<{ domain: EmailDomain; dnsRecords: DnsRecord[] }> {
    const normalizedSubdomain = subdomain && subdomain.trim() !== '' ? subdomain : undefined

    const existing = await this.domainsRepository.findByDomainName(
      supabase,
      userId,
      domainName,
      orgId,
    )
    if (existing) throw new BadRequestException(`Domain ${domainName} is already registered`)

    const sendgridResult = await this.sendgrid.createDomainAuthentication(
      domainName,
      normalizedSubdomain,
      customDkimSelector,
    )

    const dnsRecords = this.transformDnsRecords(sendgridResult.dns)

    const domain = await this.domainsRepository.create(supabase, {
      userId,
      domain: domainName,
      subdomain: normalizedSubdomain,
      sendgridDomainId: sendgridResult.id,
      dnsRecords,
      isDefault,
      orgId,
    })

    return { domain, dnsRecords }
  }

  async verifyDomain(
    supabase: SupabaseClient,
    userId: string,
    domainId: string,
    orgId?: string | null,
  ): Promise<{ domain: EmailDomain; allValid: boolean; records: DnsRecord[] }> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')

    const sendgridDomainId =
      typeof domain.sendgrid_domain_id === 'string'
        ? parseInt(domain.sendgrid_domain_id, 10)
        : domain.sendgrid_domain_id

    const validation = await this.sendgrid.validateDomainAuthentication(sendgridDomainId)

    const records = this.mergeValidationResults(
      domain.dns_records || [],
      validation.validation_results,
    )
    const allValid = validation.valid

    const newStatus: DomainStatus = allValid ? 'verified' : 'verifying'
    const updatedDomain = await this.domainsRepository.updateStatus(
      supabase,
      domainId,
      newStatus,
      allValid ? new Date().toISOString() : undefined,
      orgId,
    )

    await this.domainsRepository.updateDnsRecords(supabase, domainId, records, orgId)

    return { domain: updatedDomain, allValid, records }
  }

  async getDomain(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<EmailDomain> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    return domain
  }

  async listDomains(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<EmailDomain[]> {
    return this.domainsRepository.findByUserId(supabase, userId, orgId)
  }

  async hasVerifiedDomain(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    return this.domainsRepository.hasVerifiedDomain(supabase, userId, orgId)
  }

  async setDefaultDomain(
    supabase: SupabaseClient,
    userId: string,
    domainId: string,
    orgId?: string | null,
  ): Promise<void> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    if (domain.status !== 'verified')
      throw new BadRequestException('Only verified domains can be set as default')
    await this.domainsRepository.setAsDefault(supabase, userId, domainId, orgId)
  }

  async deleteDomain(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<void> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')

    if (domain.inbound_parse_enabled && domain.inbound_parse_hostname) {
      try {
        await this.sendgrid.deleteInboundParseSetting(domain.inbound_parse_hostname)
      } catch {
        this.logger.warn('Failed to delete inbound parse setting during domain deletion')
      }
    }

    try {
      const sgId =
        typeof domain.sendgrid_domain_id === 'string'
          ? parseInt(domain.sendgrid_domain_id, 10)
          : domain.sendgrid_domain_id
      await this.sendgrid.deleteDomainAuthentication(sgId)
    } catch {
      this.logger.warn('Failed to delete domain from SendGrid during domain deletion')
    }

    await this.domainsRepository.delete(supabase, domainId, orgId)
  }

  async enableReplyTracking(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<{ domain: EmailDomain; mxRecord: DnsRecord }> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    if (domain.status !== 'verified') throw new BadRequestException('Domain must be verified first')
    if (domain.inbound_parse_enabled)
      throw new BadRequestException('Reply tracking already enabled')

    const replyHostname = domain.subdomain
      ? `reply.${domain.subdomain}.${domain.domain}`
      : `reply.${domain.domain}`

    const webhookUrl = `${this.backendUrl}/api/email/webhooks/inbound`
    const result = await this.sendgrid.createInboundParseSetting(
      replyHostname,
      webhookUrl,
      true,
      false,
    )
    if (!result.success)
      throw new BadRequestException(`Failed to configure reply tracking: ${result.error}`)

    const updatedDomain = await this.domainsRepository.updateInboundParse(
      supabase,
      domainId,
      true,
      replyHostname,
      orgId,
    )

    const mxRecord: DnsRecord = {
      type: 'mx',
      host: replyHostname.replace(`.${domain.domain}`, ''),
      data: 'mx.sendgrid.net',
      valid: false,
    }

    return { domain: updatedDomain, mxRecord }
  }

  async disableReplyTracking(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<EmailDomain> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    if (!domain.inbound_parse_enabled) throw new BadRequestException('Reply tracking not enabled')

    if (domain.inbound_parse_hostname) {
      await this.sendgrid.deleteInboundParseSetting(domain.inbound_parse_hostname)
    }

    return this.domainsRepository.updateInboundParse(supabase, domainId, false, null, orgId)
  }

  async verifyReplyTrackingMx(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<{ valid: boolean; mxRecords: string[]; error?: string }> {
    const domain = await this.domainsRepository.findById(supabase, domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    if (!domain.inbound_parse_enabled || !domain.inbound_parse_hostname) {
      throw new BadRequestException('Reply tracking is not enabled')
    }

    const hostname = domain.inbound_parse_hostname
    try {
      const dns = await import('dns').then((m) => m.promises)
      const mxRecords = await dns.resolveMx(hostname)
      const exchanges = mxRecords.map((mx) => mx.exchange.toLowerCase())
      const hasValidMx = exchanges.some(
        (ex) => ex === 'mx.sendgrid.net' || ex === 'mx.sendgrid.net.',
      )

      await this.domainsRepository.updateMxVerificationStatus(supabase, domainId, hasValidMx, orgId)
      return { valid: hasValidMx, mxRecords: exchanges }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'DNS lookup failed'
      if (msg.includes('ENOTFOUND') || msg.includes('ENODATA')) {
        return {
          valid: false,
          mxRecords: [],
          error: 'No MX records found. Please add the MX record to your DNS.',
        }
      }
      return { valid: false, mxRecords: [], error: `DNS lookup failed: ${msg}` }
    }
  }

  private transformDnsRecords(dnsData: Record<string, unknown>): DnsRecord[] {
    const records: DnsRecord[] = []
    const recordTypes = ['mail_cname', 'dkim1', 'dkim2', 'spf', 'mail_server', 'subdomain_spf']

    for (const recordType of recordTypes) {
      const record = dnsData[recordType] as Record<string, unknown> | undefined
      if (record && typeof record === 'object') {
        records.push({
          type: this.inferRecordType(recordType),
          host: (record.host as string) || '',
          data: (record.data as string) || '',
          valid: Boolean(record.valid),
        })
      }
    }
    return records
  }

  private inferRecordType(fieldName: string): 'cname' | 'txt' | 'mx' {
    if (fieldName.includes('cname') || fieldName.includes('dkim')) return 'cname'
    if (fieldName.includes('spf')) return 'txt'
    if (fieldName.includes('mail_server')) return 'mx'
    return 'cname'
  }

  private mergeValidationResults(
    existingRecords: DnsRecord[],
    validationResults: {
      mail_cname?: { valid: boolean; reason: string | null }
      dkim1?: { valid: boolean; reason: string | null }
      dkim2?: { valid: boolean; reason: string | null }
      spf?: { valid: boolean; reason: string | null }
    },
  ): DnsRecord[] {
    return existingRecords.map((record) => {
      let validationKey: string | undefined

      if (
        record.host.match(/^em\d+\./i) ||
        (!record.host.includes('_domainkey') &&
          !record.host.includes('_dmarc') &&
          record.type === 'cname')
      ) {
        validationKey = 'mail_cname'
      } else if (record.host.includes('s1._domainkey')) {
        validationKey = 'dkim1'
      } else if (record.host.includes('s2._domainkey')) {
        validationKey = 'dkim2'
      } else if (record.type === 'txt' && record.data.includes('spf')) {
        validationKey = 'spf'
      }

      if (validationKey && validationResults[validationKey as keyof typeof validationResults]) {
        const vr = validationResults[validationKey as keyof typeof validationResults]
        return { ...record, valid: vr?.valid ?? record.valid }
      }
      return record
    })
  }
}
