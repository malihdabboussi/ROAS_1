import { BadRequestException } from '@nestjs/common'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import type { DnsRecord, DomainStatus } from '../../email/types/email.types'
import { AdminMissionReliabilityBase } from './admin-service-mission-reliability.base'

export abstract class AdminPlatformEmailBase extends AdminMissionReliabilityBase {
  async getPlatformEmailConfig() {
    const { data, error } = await this.repository
      .serviceTable('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return { config: data }
  }

  async setPlatformEmailDomain(adminUserId: string, domain: string, subdomain?: string) {
    const normalizedSubdomain = subdomain && subdomain.trim() !== '' ? subdomain.trim() : undefined
    const sendgridResult = await this.sendgrid.createDomainAuthentication(
      domain.trim(),
      normalizedSubdomain,
    )
    const dnsRecords = this.adminTransformDnsRecords(sendgridResult.dns as Record<string, unknown>)

    const { data: existing } = await this.repository
      .serviceTable('platform_email_config')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const payload = {
      domain: domain.trim(),
      subdomain: normalizedSubdomain ?? null,
      sendgrid_domain_id: sendgridResult.id,
      dns_records: dnsRecords,
      domain_status: 'pending' as DomainStatus,
      domain_verified_at: null as string | null,
      configured_by: adminUserId,
    }

    if (existing?.id) {
      const { data, error } = await this.repository
        .serviceTable('platform_email_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return { config: data, dnsRecords }
    }

    const { data, error } = await this.repository
      .serviceTable('platform_email_config')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return { config: data, dnsRecords }
  }

  async verifyPlatformEmailDomain() {
    const { data: row, error: rowErr } = await this.repository
      .serviceTable('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (rowErr) throw rowErr
    if (!row?.sendgrid_domain_id) throw new BadRequestException('Platform domain not configured')

    const sgId =
      typeof row.sendgrid_domain_id === 'string'
        ? parseInt(row.sendgrid_domain_id, 10)
        : Number(row.sendgrid_domain_id)

    const validation = await this.sendgrid.validateDomainAuthentication(sgId)
    const existingRecords = (row.dns_records as DnsRecord[]) || []
    const records = this.adminMergeValidationResults(existingRecords, validation.validation_results)
    const allValid = validation.valid
    const newStatus: DomainStatus = allValid ? 'verified' : 'verifying'

    const { data, error } = await this.repository
      .serviceTable('platform_email_config')
      .update({
        domain_status: newStatus,
        dns_records: records,
        domain_verified_at: allValid ? new Date().toISOString() : null,
      })
      .eq('id', row.id)
      .select()
      .single()
    if (error) throw error
    return { config: data, allValid, records }
  }

  async syncPlatformEmailSender() {
    const { data: row, error } = await this.repository
      .serviceTable('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!row?.sendgrid_sender_id) {
      throw new BadRequestException('No platform sender configured')
    }
    const sgId =
      typeof row.sendgrid_sender_id === 'string'
        ? parseInt(row.sendgrid_sender_id, 10)
        : Number(row.sendgrid_sender_id)
    const sg = await this.sendgrid.getSenderIdentity(sgId)
    const isVerified = sg.verified?.status || false
    const { data, error: upErr } = await this.repository
      .serviceTable('platform_email_config')
      .update({ sender_verified: isVerified })
      .eq('id', row.id)
      .select()
      .single()
    if (upErr) throw upErr
    return { config: data, senderVerified: isVerified }
  }

  async setPlatformEmailSender(
    adminUserId: string,
    body: {
      email: string
      name: string
      replyTo?: string
      address: string
      city: string
      country: string
      state?: string
      zip?: string
    },
  ) {
    const { data: row, error: rowErr } = await this.repository
      .serviceTable('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (rowErr) throw rowErr
    if (!row) throw new BadRequestException('Configure platform domain first')
    if (row.domain_status !== 'verified') {
      throw new BadRequestException('Domain must be verified before creating sender')
    }

    let sgResult: Awaited<ReturnType<SendGridIntegration['createSenderIdentity']>>
    try {
      sgResult = await this.sendgrid.createSenderIdentity({
        nickname: `platform-${body.email}`,
        fromEmail: body.email.trim(),
        fromName: body.name.trim(),
        replyToEmail: body.replyTo?.trim() || body.email.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        country: body.country.trim(),
        state: body.state?.trim(),
        zip: body.zip?.trim(),
      })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const m = raw.replace(/^Sender identity creation failed:\s*/i, '').trim()
      throw new BadRequestException(m || raw)
    }

    const isVerified = sgResult.verified?.status || false

    const { data, error } = await this.repository
      .serviceTable('platform_email_config')
      .update({
        sender_email: body.email.trim(),
        sender_name: body.name.trim(),
        sendgrid_sender_id: sgResult.id,
        sender_verified: isVerified,
        reply_to_email: body.replyTo?.trim() || body.email.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        country: body.country.trim(),
        configured_by: adminUserId,
      })
      .eq('id', row.id)
      .select()
      .single()
    if (error) throw error
    return { config: data }
  }


  protected adminTransformDnsRecords(dnsData: Record<string, unknown>): DnsRecord[] {
    const records: DnsRecord[] = []
    const recordTypes = ['mail_cname', 'dkim1', 'dkim2', 'spf', 'mail_server', 'subdomain_spf']
    for (const recordType of recordTypes) {
      const record = dnsData[recordType] as Record<string, unknown> | undefined
      if (record && typeof record === 'object') {
        records.push({
          type: this.adminInferRecordType(recordType),
          host: (record.host as string) || '',
          data: (record.data as string) || '',
          valid: Boolean(record.valid),
        })
      }
    }
    return records
  }

  protected adminInferRecordType(fieldName: string): 'cname' | 'txt' | 'mx' {
    if (fieldName.includes('cname') || fieldName.includes('dkim')) return 'cname'
    if (fieldName.includes('spf')) return 'txt'
    if (fieldName.includes('mail_server')) return 'mx'
    return 'cname'
  }

  protected adminMergeValidationResults(
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
