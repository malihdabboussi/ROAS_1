import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DnsRecord,
  DomainStatus,
  DomainVerification,
  VercelDomainResponse,
} from '../types/domains.types'

export interface VercelDomainResult {
  success: boolean
  data?: VercelDomainResponse
  verification_records?: DnsRecord[]
  error?: string
}

@Injectable()
export class VercelIntegration {
  private readonly logger = new Logger(VercelIntegration.name)
  private readonly API_BASE = 'https://api.vercel.com'
  private readonly VERCEL_TOKEN: string
  private readonly VERCEL_FUNNELS_PROJECT_ID: string
  private readonly VERCEL_TEAM_ID: string | undefined

  constructor(private readonly configService: ConfigService) {
    this.VERCEL_TOKEN = this.configService.get<string>('VERCEL_TOKEN') || ''
    this.VERCEL_FUNNELS_PROJECT_ID =
      this.configService.get<string>('VERCEL_FUNNELS_PROJECT_ID') || ''
    this.VERCEL_TEAM_ID = this.configService.get<string>('VERCEL_TEAM_ID')
  }

  private buildUrl(path: string): string {
    return this.VERCEL_TEAM_ID
      ? `${this.API_BASE}${path}${path.includes('?') ? '&' : '?'}teamId=${this.VERCEL_TEAM_ID}`
      : `${this.API_BASE}${path}`
  }

  async addDomain(
    domainName: string,
    environment: 'production' | 'staging' = 'production',
  ): Promise<VercelDomainResult> {
    if (!this.VERCEL_TOKEN || !this.VERCEL_FUNNELS_PROJECT_ID) {
      return {
        success: false,
        error: 'Vercel configuration missing. Check VERCEL_TOKEN and VERCEL_FUNNELS_PROJECT_ID.',
      }
    }

    try {
      const url = this.buildUrl(`/v10/projects/${this.VERCEL_FUNNELS_PROJECT_ID}/domains`)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domainName,
          gitBranch: environment === 'staging' ? 'staging' : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const error = data.error || { message: 'Unknown error', code: 'unknown' }
        return {
          success: false,
          error: `Vercel API error: ${error.message} (${error.code})`,
        }
      }

      const domainData = data as VercelDomainResponse
      let records = this.extractDnsRecords(domainData)

      if (!records.length) {
        const config = await this.getDomainConfiguration(domainName)
        if (config.success && config.verification_records) {
          records = config.verification_records
        }
      }

      return { success: true, data: domainData, verification_records: records }
    } catch (error) {
      this.logger.error('Failed to add domain to Vercel', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add domain to Vercel',
      }
    }
  }

  async getDomainConfiguration(domainName: string): Promise<VercelDomainResult> {
    if (!this.VERCEL_TOKEN) {
      return { success: false, error: 'Vercel configuration missing.' }
    }

    try {
      const url = this.buildUrl(`/v6/domains/${domainName}/config`)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.VERCEL_TOKEN}` },
      })

      const data = await response.json()
      if (!response.ok) {
        const error = data.error || { message: 'Unknown error', code: 'unknown' }
        return { success: false, error: `Vercel API error: ${error.message} (${error.code})` }
      }

      const records = this.extractDnsRecordsFromConfig(data, domainName)
      return { success: true, data: data as VercelDomainResponse, verification_records: records }
    } catch (error) {
      this.logger.error('Failed to get domain configuration', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get domain configuration',
      }
    }
  }

  async verifyDomain(domainName: string): Promise<VercelDomainResult> {
    return this.getDomainConfiguration(domainName)
  }

  async checkSSLCertificate(domainName: string): Promise<{
    success: boolean
    sslReady: boolean
    error?: string
  }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        await fetch(`https://${domainName}`, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'manual',
        })

        clearTimeout(timeoutId)
        return { success: true, sslReady: true }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === 'AbortError') {
          return {
            success: true,
            sslReady: false,
            error: 'SSL certificate still provisioning (timeout)',
          }
        }

        const errorMessage = fetchError.message?.toLowerCase() || ''
        if (
          errorMessage.includes('certificate') ||
          errorMessage.includes('ssl') ||
          errorMessage.includes('tls') ||
          errorMessage.includes('handshake')
        ) {
          return { success: true, sslReady: false, error: fetchError.message }
        }

        return { success: true, sslReady: false, error: fetchError.message }
      }
    } catch (error) {
      return {
        success: false,
        sslReady: false,
        error: error instanceof Error ? error.message : 'Unknown error checking SSL',
      }
    }
  }

  async waitForSSLReady(
    domainName: string,
    maxWaitMinutes: number = 10,
  ): Promise<{ success: boolean; sslReady: boolean; error?: string }> {
    if (!this.VERCEL_TOKEN || !this.VERCEL_FUNNELS_PROJECT_ID) {
      return { success: false, sslReady: false, error: 'Vercel configuration missing' }
    }

    const maxAttempts = Math.floor((maxWaitMinutes * 60) / 10)
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const projectDomainUrl = this.buildUrl(
          `/v9/projects/${this.VERCEL_FUNNELS_PROJECT_ID}/domains/${domainName}`,
        )

        const domainResponse = await fetch(projectDomainUrl, {
          headers: { Authorization: `Bearer ${this.VERCEL_TOKEN}` },
        })

        if (!domainResponse.ok) {
          attempts++
          await new Promise((resolve) => setTimeout(resolve, 10000))
          continue
        }

        const domainData = await domainResponse.json()
        const configResult = await this.getDomainConfiguration(domainName)

        const isVerified = domainData.verified === true
        const isConfigured =
          configResult.success &&
          (configResult.data as any)?.configuredBy !== null &&
          (configResult.data as any)?.misconfigured !== true

        if (isVerified && isConfigured) {
          return { success: true, sslReady: true }
        }

        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 10000))
        }
      } catch {
        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 10000))
        }
      }
    }

    return {
      success: true,
      sslReady: false,
      error: `SSL not ready after ${maxWaitMinutes} minutes. Domain may still be provisioning.`,
    }
  }

  async removeDomain(domainName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.VERCEL_TOKEN || !this.VERCEL_FUNNELS_PROJECT_ID) {
      return { success: false, error: 'Vercel configuration missing.' }
    }

    try {
      const url = this.buildUrl(
        `/v9/projects/${this.VERCEL_FUNNELS_PROJECT_ID}/domains/${domainName}`,
      )
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.VERCEL_TOKEN}` },
      })

      if (!response.ok) {
        const data = await response.json()
        const error = data.error || { message: 'Unknown error', code: 'unknown' }
        return { success: false, error: `Vercel API error: ${error.message} (${error.code})` }
      }

      return { success: true }
    } catch (error) {
      this.logger.error('Failed to remove domain from Vercel', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove domain from Vercel',
      }
    }
  }

  async listDomains(): Promise<{
    success: boolean
    domains?: VercelDomainResponse[]
    error?: string
  }> {
    if (!this.VERCEL_TOKEN || !this.VERCEL_FUNNELS_PROJECT_ID) {
      return { success: false, error: 'Vercel configuration missing.' }
    }

    try {
      const url = this.buildUrl(`/v9/projects/${this.VERCEL_FUNNELS_PROJECT_ID}/domains`)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.VERCEL_TOKEN}` },
      })

      const data = await response.json()

      if (!response.ok) {
        const error = data.error || { message: 'Unknown error', code: 'unknown' }
        return { success: false, error: `Vercel API error: ${error.message} (${error.code})` }
      }

      return { success: true, domains: data.domains || [] }
    } catch (error) {
      this.logger.error('Failed to list domains from Vercel', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list domains from Vercel',
      }
    }
  }

  getDomainStatus(domainData: any): DomainStatus {
    if (domainData.error) return 'error'

    if (domainData.configuredBy !== undefined) {
      if (domainData.configuredBy !== null && !domainData.misconfigured) {
        return 'dns_verified'
      }
      return 'dns_verifying'
    }

    if (domainData.configured) return 'dns_verified'
    if (domainData.verification?.length > 0) return 'dns_verifying'

    return 'pending'
  }

  private extractDnsRecords(domainData: VercelDomainResponse): DnsRecord[] {
    const records: DnsRecord[] = []
    if (domainData.verification) {
      for (const v of domainData.verification) {
        records.push({
          type: v.type as DnsRecord['type'],
          name: v.domain === domainData.name ? '@' : v.domain.replace(`.${domainData.name}`, ''),
          value: v.value,
        })
      }
    }
    return records
  }

  private extractDnsRecordsFromConfig(config: any, domainName: string): DnsRecord[] {
    const records: DnsRecord[] = []
    const isSubdomain = domainName.split('.').length > 2

    if (isSubdomain) {
      const cnames = config.recommendedCNAME as Array<{ rank: number; value: string }> | undefined
      if (cnames?.length) {
        const preferred = cnames.find((r: { rank: number }) => r.rank === 1) || cnames[0]
        if (preferred) {
          records.push({
            type: 'CNAME',
            name: domainName.split('.')[0],
            value: preferred.value,
          })
        }
      }
    } else {
      const ipv4 = config.recommendedIPv4 as Array<{ rank: number; value: string[] }> | undefined
      if (ipv4?.length) {
        const preferred = ipv4.find((r: { rank: number }) => r.rank === 1) || ipv4[0]
        if (preferred?.value) {
          for (const ip of preferred.value) {
            records.push({ type: 'A', name: '@', value: ip })
          }
        }
      }
    }

    return records
  }

  private isSubdomain(domain: string): boolean {
    return domain.split('.').length > 2
  }
}
