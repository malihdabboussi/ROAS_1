import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PageGraderClientImportService } from '../../../brain/services/page-grader-client-import.service'
import { VaultService } from '../../../vault/services/vault.service'
import type { ImportPageGraderClientBrainDto } from '../dto/page-grader.dto'
import { PageGraderIntegration } from '../integrations/page-grader.integration'
import { PageGraderApiService } from './page-grader-api.service'

const PROVIDER = 'page_grader'
const LABEL_BASE_URL = 'base_url'
const LABEL_API_KEY = 'api_key'

@Injectable()
export class PageGraderBrainImportService {
  constructor(
    private readonly pageGrader: PageGraderIntegration,
    private readonly vault: VaultService,
    private readonly clientImport: PageGraderClientImportService,
    private readonly api: PageGraderApiService,
  ) {}

  private async getCreds(userId: string) {
    const [baseUrl, apiKey] = await Promise.all([
      this.vault.getSecret(userId, PROVIDER, LABEL_BASE_URL),
      this.vault.getSecret(userId, PROVIDER, LABEL_API_KEY),
    ])
    if (!baseUrl || !apiKey) throw new BadRequestException('The ROAS Portal is not connected')
    return { baseUrl, apiKey }
  }

  async importClientBrain(
    supabase: SupabaseClient,
    userId: string,
    dto: ImportPageGraderClientBrainDto,
    orgId?: string | null,
  ) {
    const creds = await this.getCreds(userId)
    const pkg = await this.pageGrader.getClientBrainPackage(
      creds.baseUrl,
      creds.apiKey,
      dto.client_id,
    )
    const result = await this.clientImport.importPackage(
      supabase,
      userId,
      {
        package: pkg,
        dryRun: dto.dryRun,
        force: dto.force,
        campaignId: dto.campaignId,
        campaignName: dto.campaignName,
        campaignHint: dto.campaignHint,
        spaceId: dto.spaceId,
        spaceTitle: dto.spaceTitle,
      },
      { userId, orgId: orgId ?? null } as never,
    )

    if (dto.dryRun) return result

    const campaignId =
      result && typeof result === 'object' && result.campaign && typeof result.campaign === 'object'
        ? String((result.campaign as { id?: unknown }).id ?? '').trim()
        : ''
    const campaignName =
      result && typeof result === 'object' && result.campaign && typeof result.campaign === 'object'
        ? String((result.campaign as { name?: unknown }).name ?? '').trim() || null
        : null
    const spaceId =
      result && typeof result === 'object' && result.space && typeof result.space === 'object'
        ? String((result.space as { id?: unknown }).id ?? '').trim() || null
        : null
    const spaceTitle =
      result && typeof result === 'object' && result.space && typeof result.space === 'object'
        ? String((result.space as { title?: unknown }).title ?? '').trim() || null
        : null
    const brainImport =
      result &&
      typeof result === 'object' &&
      result.brainImport &&
      typeof result.brainImport === 'object'
        ? (result.brainImport as Record<string, unknown>)
        : {}

    if (campaignId) {
      await this.api.mergeClientScopeEntry(userId, {
        clientId: dto.client_id,
        campaignId,
        campaignName,
        spaceId,
        spaceTitle,
        contentHash: typeof brainImport.contentHash === 'string' ? brainImport.contentHash : null,
        lastSyncedAt: new Date().toISOString(),
        lastSyncStatus:
          brainImport.skippedUnchanged === true
            ? 'skipped_unchanged'
            : typeof brainImport.status === 'string'
              ? brainImport.status
              : 'succeeded',
      })
    }

    return result
  }
}
