import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PageGraderClientImportService } from '../../../brain/services/page-grader-client-import.service'
import { VaultService } from '../../../vault/services/vault.service'
import type { ImportPageGraderClientBrainDto } from '../dto/page-grader.dto'
import { PageGraderIntegration } from '../integrations/page-grader.integration'

const PROVIDER = 'page_grader'
const LABEL_BASE_URL = 'base_url'
const LABEL_API_KEY = 'api_key'

@Injectable()
export class PageGraderBrainImportService {
  constructor(
    private readonly pageGrader: PageGraderIntegration,
    private readonly vault: VaultService,
    private readonly clientImport: PageGraderClientImportService,
  ) {}

  private async getCreds(userId: string) {
    const [baseUrl, apiKey] = await Promise.all([
      this.vault.getSecret(userId, PROVIDER, LABEL_BASE_URL),
      this.vault.getSecret(userId, PROVIDER, LABEL_API_KEY),
    ])
    if (!baseUrl || !apiKey) throw new BadRequestException('Page Grader is not connected')
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
    return this.clientImport.importPackage(
      supabase,
      userId,
      {
        package: pkg,
        dryRun: dto.dryRun,
        campaignId: dto.campaignId,
        campaignName: dto.campaignName,
        campaignHint: dto.campaignHint,
        spaceId: dto.spaceId,
        spaceTitle: dto.spaceTitle,
      },
      { userId, orgId: orgId ?? null } as never,
    )
  }
}
