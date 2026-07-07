import { BadRequestException, Logger, NotFoundException, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { VercelIntegration } from '../../domains/integrations/vercel.integration'
import { MetaApiService } from '../../integrations/meta/services/meta-api.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { CampaignArtifactAdsRepository } from '../repositories/campaign-artifact-ads.repository'
import { CampaignArtifactContentRepository } from '../repositories/campaign-artifact-content.repository'
import { CampaignArtifactDocumentsRepository } from '../repositories/campaign-artifact-documents.repository'
import { CampaignArtifactMoveRepository } from '../repositories/campaign-artifact-move.repository'
import { CampaignArtifactOffersRepository } from '../repositories/campaign-artifact-offers.repository'
import { CampaignArtifactPresentationsRepository } from '../repositories/campaign-artifact-presentations.repository'
import { CampaignArtifactSequencesRepository } from '../repositories/campaign-artifact-sequences.repository'
import type { PresentationInitialFileInput } from './artifacts.types'

export class ArtifactsOffersBase {
  protected readonly defaultPresentationIndexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Untitled Presentation</title>
  <style>
    html, body { margin: 0; min-height: 100%; font-family: Inter, system-ui, sans-serif; background: #0f1116; color: #e5e7eb; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
    section { width: min(960px, 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 32px; background: rgba(255,255,255,0.05); }
    h1 { margin: 0 0 12px; font-size: clamp(32px, 7vw, 72px); line-height: 0.95; }
    p { margin: 0; font-size: 18px; opacity: 0.84; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Untitled Presentation</h1>
      <p>Ask Vibey to design this deck, or edit the HTML source directly.</p>
    </section>
  </main>
</body>
</html>`

  protected readonly publishFallbackPresentationTsx = `export default function PresentationPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', background: '#0f1116', color: '#e5e7eb' }}>
      <section style={{ maxWidth: '720px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>This presentation is being repaired</h1>
        <p style={{ margin: 0, opacity: 0.86 }}>
          The published TSX failed validation and was auto-recovered with a safe fallback.
        </p>
      </section>
    </main>
  )
}`

  protected readonly logger = new Logger('ArtifactsService')

  constructor(
    protected readonly metaApiService: MetaApiService,
    protected readonly vercelIntegration: VercelIntegration,
    protected readonly spaceRetrievalIndex: SpaceRetrievalIndexService,
    @Optional()
    protected readonly spaceAutomation?: SpaceAutomationService,
    artifactPresentationsRepo?: CampaignArtifactPresentationsRepository,
    artifactDocumentsRepo?: CampaignArtifactDocumentsRepository,
    artifactContentRepo?: CampaignArtifactContentRepository,
    artifactSequencesRepo?: CampaignArtifactSequencesRepository,
    artifactAdsRepo?: CampaignArtifactAdsRepository,
    artifactMoveRepo?: CampaignArtifactMoveRepository,
    artifactOffersRepo?: CampaignArtifactOffersRepository,
  ) {
    this.artifactPresentationsRepo =
      artifactPresentationsRepo ?? new CampaignArtifactPresentationsRepository()
    this.artifactDocumentsRepo = artifactDocumentsRepo ?? new CampaignArtifactDocumentsRepository()
    this.artifactContentRepo = artifactContentRepo ?? new CampaignArtifactContentRepository()
    this.artifactSequencesRepo = artifactSequencesRepo ?? new CampaignArtifactSequencesRepository()
    this.artifactAdsRepo = artifactAdsRepo ?? new CampaignArtifactAdsRepository()
    this.artifactMoveRepo = artifactMoveRepo ?? new CampaignArtifactMoveRepository()
    this.artifactOffersRepo = artifactOffersRepo ?? new CampaignArtifactOffersRepository()
  }

  protected readonly artifactPresentationsRepo: CampaignArtifactPresentationsRepository
  protected readonly artifactDocumentsRepo: CampaignArtifactDocumentsRepository
  protected readonly artifactContentRepo: CampaignArtifactContentRepository
  protected readonly artifactSequencesRepo: CampaignArtifactSequencesRepository
  protected readonly artifactAdsRepo: CampaignArtifactAdsRepository
  protected readonly artifactMoveRepo: CampaignArtifactMoveRepository
  protected readonly artifactOffersRepo: CampaignArtifactOffersRepository

  protected sanitizePresentationBundlePath(path: string): string {
    const value = String(path ?? '').trim()
    if (
      !value ||
      value.startsWith('/') ||
      /^[A-Za-z]:/.test(value) ||
      value.includes('\\') ||
      value.split('/').includes('..')
    ) {
      throw new BadRequestException('Invalid presentation file path')
    }
    return value
  }

  protected getPresentationMetadata(row: Record<string, unknown>): Record<string, unknown> {
    const metadata = row.metadata
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {}
  }

  protected getMimeTypeForPresentationPath(path: string): string {
    if (path.endsWith('.css')) return 'text/css'
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript'
    if (path.endsWith('.json')) return 'application/json'
    if (path.endsWith('.svg')) return 'image/svg+xml'
    if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html'
    return 'text/plain'
  }

  protected normalizePresentationInitialFiles(
    files?: PresentationInitialFileInput[],
  ): PresentationInitialFileInput[] {
    return (files ?? []).map((file) => ({
      path: this.sanitizePresentationBundlePath(file.path),
      content: String(file.content ?? ''),
      role: file.role,
    }))
  }

  protected resolvePresentationEntryFile(
    entryFile: string | undefined,
    files: PresentationInitialFileInput[],
  ): string {
    const safeEntry = entryFile
      ? this.sanitizePresentationBundlePath(entryFile)
      : (files.find((file) => file.role === 'entry')?.path ?? 'index.html')
    if (!files.some((file) => file.path === safeEntry)) {
      throw new BadRequestException('entry_file must match an uploaded presentation file')
    }
    return safeEntry
  }

  // ─── Offers ───

  async listOffers(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    return this.artifactOffersRepo.listOffers(supabase, campaignId, spaceId)
  }

  async getOffer(supabase: SupabaseClient, id: string) {
    const data = await this.artifactOffersRepo.getOffer(supabase, id)
    if (!data) throw new NotFoundException('Offer not found')
    return data
  }

  async updateOffer(supabase: SupabaseClient, id: string, name?: string) {
    const offer = await this.getOffer(supabase, id)
    return this.artifactOffersRepo.updateOffer(supabase, id, {
      name: name ?? offer.name,
      updated_at: new Date().toISOString(),
    })
  }

  async deleteOffer(supabase: SupabaseClient, id: string) {
    await this.getOffer(supabase, id)
    await this.artifactOffersRepo.deleteOffer(supabase, id)
  }

  async createOffer(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
  ) {
    return this.artifactOffersRepo.createOffer(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name,
      processing_status: 'step_1_pending',
      org_id: orgId ?? null,
      space_id: spaceId ?? null,
    })
  }

  async createSequence(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
  ) {
    return this.artifactOffersRepo.createSequence(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name,
      status: 'draft',
      org_id: orgId ?? null,
      space_id: spaceId ?? null,
    })
  }

  async createAvatar(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
  ) {
    return this.artifactOffersRepo.createAvatar(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name,
      avatar_type: 'buyer_persona',
      persona_data: {},
      org_id: orgId ?? null,
      space_id: spaceId ?? null,
    })
  }

  async getAvatar(supabase: SupabaseClient, offerId: string) {
    const data = await this.artifactOffersRepo.getAvatarByOfferId(supabase, offerId)
    if (!data) throw new NotFoundException('Avatar not found for this offer')
    return data
  }
}
