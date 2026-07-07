import { type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AuthGuard, SupabaseServiceClient } from '@vibey/api-shared'
import { AppModule } from '../../../app.module'
import { CreditsGuard } from '../../../modules/billing/guards/credits.guard'
import { BrainAuthGuard } from '../../../modules/brain/guards/brain-auth.guard'
import type { MediaAssetRow } from '../../../modules/media/dto'
import { MediaService } from '../../../modules/media/services/media.service'
import { createMockSupabase, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ASSET_ID = '44444444-4444-4444-8444-444444444444'

class PassthroughGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return true
  }
}

function buildMediaServiceStub(rows: MediaAssetRow[]): MediaService {
  return {
    listAssets: async (query, user, orgId) => {
      const shared = Boolean(query.campaign_id) && typeof orgId === 'string' && orgId.length > 0
      let list = [...rows]
      if (shared) {
        list = list.filter((r) => r.org_id === orgId && r.campaign_id === query.campaign_id)
      } else {
        list = list.filter((r) => r.user_id === user.id)
        if (orgId !== undefined && orgId !== null) {
          list = orgId
            ? list.filter((r) => r.org_id === orgId)
            : list.filter((r) => r.org_id == null)
        }
        if (query.campaign_id) {
          list = list.filter((r) => r.campaign_id === query.campaign_id)
        }
      }
      return { assets: list, total: list.length }
    },
    getAsset: async (id, user, orgId) => {
      const row = rows.find((r) => r.id === id)
      if (!row) return null
      const owned = row.user_id === user.id && (orgId ? row.org_id === orgId : row.org_id == null)
      if (owned) return row
      if (orgId && row.org_id === orgId && row.campaign_id) return row
      return null
    },
    updateAsset: async (id, input, user, orgId) => {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) return null
      const row = rows[idx]!
      if (row.user_id !== user.id) return null
      if (orgId ? row.org_id !== orgId : row.org_id != null) return null
      const updated = { ...row, ...input, updated_at: new Date().toISOString() }
      rows[idx] = updated as MediaAssetRow
      return updated as MediaAssetRow
    },
    deleteAsset: async (id, user, orgId) => {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) return false
      const row = rows[idx]!
      if (row.user_id !== user.id) return false
      if (orgId ? row.org_id !== orgId : row.org_id != null) return false
      rows.splice(idx, 1)
      return true
    },
  } as unknown as MediaService
}

async function createMediaOrgApp(
  orgId: string,
  tableData: Record<string, unknown[]>,
  mediaRows: MediaAssetRow[],
): Promise<INestApplication> {
  const merged: Record<string, unknown[]> = { ...tableData }
  if (!Object.prototype.hasOwnProperty.call(merged, 'org_members')) {
    merged.org_members = [
      {
        id: 'integration-test-org-member',
        org_id: orgId,
        user_id: TEST_USER.id,
        role: 'owner',
        status: 'active',
      },
    ]
  }
  const mockSupa = createMockSupabase(merged as Record<string, any>)
  const mediaStub = buildMediaServiceStub(mediaRows)

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useClass(PassthroughGuard)
    .overrideGuard(BrainAuthGuard)
    .useClass(PassthroughGuard)
    .overrideGuard(CreditsGuard)
    .useClass(PassthroughGuard)
    .overrideProvider(SupabaseServiceClient)
    .useValue({ client: mockSupa })
    .overrideProvider(MediaService)
    .useValue(mediaStub)
    .compile()

  const app = moduleRef.createNestApplication({ rawBody: true })
  app.setGlobalPrefix('api')
  app.use((req: any, _res: any, next: any) => {
    req.user = TEST_USER
    req.supabase = mockSupa
    next()
  })
  await app.init()
  return app
}

describe('Org Scoping: Media', () => {
  const baseAsset = (): MediaAssetRow => ({
    id: ASSET_ID,
    user_id: TEST_USER.id,
    name: 'Test',
    original_filename: 't.png',
    file_path: 'p/t.png',
    bucket_name: 'media',
    file_size: 1,
    mime_type: 'image/png',
    width: null,
    height: null,
    asset_type: 'image',
    category: 'upload',
    subcategory: null,
    campaign_id: null,
    org_id: ORG_A,
    tags: [],
    description: null,
    is_public: false,
    public_url: null,
    source: 'upload',
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-04-14T12:00:00.000Z',
    updated_at: '2026-04-14T12:00:00.000Z',
  })

  describe('HTTP org isolation (MediaService stub + org guard mock)', () => {
    let app: INestApplication
    let mediaRows: MediaAssetRow[]

    beforeAll(async () => {
      mediaRows = [baseAsset()]
      app = await createMediaOrgApp(ORG_A, {}, mediaRows)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('GET /api/media/assets returns assets for org library scope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/media/assets')
        .set('x-org-id', ORG_A)
        .expect(200)
      expect(res.body.assets).toBeDefined()
      expect(Array.isArray(res.body.assets)).toBe(true)
      expect(res.body.assets.some((a: { id: string }) => a.id === ASSET_ID)).toBe(true)
    })

    it('GET /api/media/assets/:id returns 400 when asset is not visible in org (cross-org / missing row)', async () => {
      const emptyRows: MediaAssetRow[] = []
      const emptyApp = await createMediaOrgApp(ORG_B, {}, emptyRows)
      await request(emptyApp.getHttpServer())
        .get(`/api/media/assets/${ASSET_ID}`)
        .set('x-org-id', ORG_B)
        .expect(400)
      await emptyApp.close()
    })

    it('PATCH /api/media/assets/:id returns 400 for cross-org / missing asset', async () => {
      const emptyRows: MediaAssetRow[] = []
      const emptyApp = await createMediaOrgApp(ORG_B, {}, emptyRows)
      await request(emptyApp.getHttpServer())
        .patch(`/api/media/assets/${ASSET_ID}`)
        .set('x-org-id', ORG_B)
        .send({ name: 'nope' })
        .expect(400)
      await emptyApp.close()
    })

    it('DELETE /api/media/assets/:id returns 400 for cross-org / missing asset', async () => {
      const emptyRows: MediaAssetRow[] = []
      const emptyApp = await createMediaOrgApp(ORG_B, {}, emptyRows)
      await request(emptyApp.getHttpServer())
        .delete(`/api/media/assets/${ASSET_ID}`)
        .set('x-org-id', ORG_B)
        .expect(400)
      await emptyApp.close()
    })
  })
})
