import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ROAS_FUNNELS_BASE_DOMAIN } from '../../../lib/platform-defaults'

interface CloudflareRecord {
  id: string
  name: string
  type: string
  content: string
  ttl: number
}

interface CloudflareResponse {
  success: boolean
  result?: CloudflareRecord
  errors?: Array<{ code: number; message: string }>
}

export interface CloudflareResult {
  success: boolean
  record?: CloudflareRecord
  error?: string
}

@Injectable()
export class CloudflareIntegration {
  private readonly logger = new Logger(CloudflareIntegration.name)
  private readonly API_BASE = 'https://api.cloudflare.com/client/v4'
  private readonly API_TOKEN: string
  private readonly ZONE_ID: string
  private readonly BASE_DOMAIN: string

  constructor(private readonly configService: ConfigService) {
    this.API_TOKEN = this.configService.get<string>('CLOUDFLARE_API_TOKEN') || ''
    this.ZONE_ID = this.configService.get<string>('CLOUDFLARE_ZONE_ID') || ''
    this.BASE_DOMAIN =
      this.configService.get<string>('CLOUDFLARE_BASE_DOMAIN') || ROAS_FUNNELS_BASE_DOMAIN
  }

  getBaseDomain(): string {
    return this.BASE_DOMAIN
  }

  isConfigured(): boolean {
    return !!(this.API_TOKEN && this.ZONE_ID)
  }

  async addCNAME(subdomain: string, target: string): Promise<CloudflareResult> {
    if (!this.API_TOKEN || !this.ZONE_ID) {
      return {
        success: false,
        error: 'Missing Cloudflare credentials (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID)',
      }
    }

    try {
      const response = await fetch(`${this.API_BASE}/zones/${this.ZONE_ID}/dns_records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: subdomain,
          content: target,
          ttl: 300,
          proxied: false,
        }),
      })

      const raw = await response.text()
      let data: CloudflareResponse
      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          success: false,
          errors: [
            {
              code: -1,
              message: `Non-JSON response (${response.status} ${response.statusText}): ${raw.slice(0, 300)}`,
            },
          ],
        } as CloudflareResponse
      }

      if (!response.ok || !data.success) {
        const errorMsg = data.errors?.[0]?.message || 'Unknown Cloudflare error'
        this.logger.error('Cloudflare API error:', {
          status: response.status,
          errorMsg,
          subdomain,
        })
        return { success: false, error: errorMsg }
      }

      return { success: true, record: data.result }
    } catch (error) {
      this.logger.error('Cloudflare addCNAME error', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async removeCNAME(recordId: string): Promise<CloudflareResult> {
    if (!this.API_TOKEN || !this.ZONE_ID) {
      return {
        success: false,
        error: 'Missing Cloudflare credentials (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID)',
      }
    }

    try {
      const response = await fetch(
        `${this.API_BASE}/zones/${this.ZONE_ID}/dns_records/${recordId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${this.API_TOKEN}` },
        },
      )

      const raw = await response.text()
      let data: CloudflareResponse
      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          success: false,
          errors: [
            {
              code: -1,
              message: `Non-JSON response (${response.status} ${response.statusText}): ${raw.slice(0, 300)}`,
            },
          ],
        } as CloudflareResponse
      }

      if (!response.ok || !data.success) {
        this.logger.error('Cloudflare delete record error:', {
          status: response.status,
          errors: data.errors,
          recordId,
        })
      }

      return {
        success: data.success,
        error: data.success ? undefined : data.errors?.[0]?.message || 'Delete failed',
      }
    } catch (error) {
      this.logger.error('Cloudflare removeCNAME error', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }
}
