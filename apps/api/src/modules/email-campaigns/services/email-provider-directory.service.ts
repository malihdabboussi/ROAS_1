import { Injectable } from '@nestjs/common'
import { EmailCampaignsRepository } from '../repositories/email-campaigns.repository'

@Injectable()
export class EmailProviderDirectoryService {
  constructor(private readonly repository: EmailCampaignsRepository) {}

  async getProviderCapabilities(): Promise<unknown[]> {
    const admin = this.repository.getAdminClient()
    const { data } = await this.repository.table(admin, 'email_provider_capabilities').select('*')
    return data ?? []
  }

  async getConnectedEmailProviders(userId: string, orgId?: string | null) {
    const admin = this.repository.getAdminClient()
    const { data: capabilities } = await this.repository
      .table(admin, 'email_provider_capabilities')
      .select('*')
    let intQ = this.repository
      .table(admin, 'user_integrations')
      .select('integration_id, status')
      .eq('user_id', userId)
      .eq('status', 'connected')
    if (orgId !== undefined) {
      intQ = orgId ? intQ.eq('org_id', orgId) : intQ.is('org_id', null)
    }
    const { data: integrations } = await intQ
    const connectedIds = new Set(
      (integrations ?? []).map((i: { integration_id: string }) => i.integration_id),
    )

    return (capabilities ?? []).filter(
      (cap: { provider: string; is_bullmq_provider: boolean }) =>
        connectedIds.has(cap.provider) || cap.is_bullmq_provider,
    )
  }

  async getProviderAudiences(userId: string, provider: string, _orgId?: string | null) {
    try {
      const apiUrl = process.env.MAIN_API_URL || `http://localhost:${process.env.PORT || '3001'}`
      const controllerBase = provider.replace(/_/g, '-')

      const [listsRes, segmentsRes] = await Promise.all([
        fetch(`${apiUrl}/api/integrations/${controllerBase}/lists`, {
          headers: {
            'X-User-Id': userId,
            'X-Internal-Token': process.env.INTERNAL_API_TOKEN || '',
          },
        }).then((r) => (r.ok ? r.json() : { data: null })),
        fetch(`${apiUrl}/api/integrations/${controllerBase}/segments`, {
          headers: {
            'X-User-Id': userId,
            'X-Internal-Token': process.env.INTERNAL_API_TOKEN || '',
          },
        }).then((r) => (r.ok ? r.json() : { data: null })),
      ])

      return {
        lists: this.normalizeAudienceList(listsRes?.data ?? listsRes),
        segments: this.normalizeAudienceList(segmentsRes?.data ?? segmentsRes),
      }
    } catch {
      return { lists: [], segments: [] }
    }
  }

  private normalizeAudienceList(raw: unknown): Array<{ id: string; name: string }> {
    if (!raw || typeof raw !== 'object') return []
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>).lists)
        ? (raw as Record<string, unknown>).lists
        : Array.isArray((raw as Record<string, unknown>).segments)
          ? (raw as Record<string, unknown>).segments
          : []
    return (items as Array<Record<string, unknown>>)
      .filter((item) => item.id && item.name)
      .map((item) => ({ id: String(item.id), name: String(item.name) }))
  }
}
