import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrgTestApp, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CAMP_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const FUNNEL_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const PAGE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

describe('Org Scoping: Funnels', () => {
  let app: INestApplication

  beforeAll(async () => {
    const { app: a } = await createOrgTestApp({
      orgId: ORG_A,
      tableData: {
        funnels: [
          {
            id: FUNNEL_ID,
            org_id: ORG_A,
            user_id: TEST_USER.id,
            campaign_id: CAMP_ID,
            name: 'Funnel A',
            funnel_type: 'lead',
            status: 'draft',
            slug: null,
            home_page_id: null,
            domain_id: null,
            published_url: null,
            created_at: '2026-04-14T12:00:00.000Z',
            updated_at: '2026-04-14T12:00:00.000Z',
          },
        ],
        funnel_pages: [
          {
            id: PAGE_ID,
            funnel_id: FUNNEL_ID,
            org_id: ORG_A,
            name: 'Home',
            page_type: 'landing',
            generated_html: 'export default function Page() { return null }',
            generated_css: '',
            order_index: 0,
            slug: 'home',
            path: '/',
            created_at: '2026-04-14T12:00:00.000Z',
            updated_at: '2026-04-14T12:00:00.000Z',
          },
        ],
      },
    })
    app = a
  }, 30_000)

  afterAll(async () => {
    await app?.close()
  })

  it('GET /api/funnels list is constrained to current org scope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/funnels')
      .query({ campaign_id: CAMP_ID })
      .set('x-org-id', ORG_A)
      .expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((f: { id: string }) => f.id === FUNNEL_ID)).toBe(true)
  })

  it('GET /api/funnels/:id returns 404 for cross-org funnel', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { funnels: [], funnel_pages: [] },
    })
    await request(emptyApp.getHttpServer())
      .get(`/api/funnels/${FUNNEL_ID}`)
      .set('x-org-id', ORG_B)
      .expect(404)
    await emptyApp.close()
  })

  it('GET /api/funnels/:id/pages/:pageId returns 404 when page / funnel not in org data', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { funnels: [], funnel_pages: [] },
    })
    await request(emptyApp.getHttpServer())
      .get(`/api/funnels/${FUNNEL_ID}/pages/${PAGE_ID}`)
      .set('x-org-id', ORG_B)
      .expect(404)
    await emptyApp.close()
  })

  it('PATCH /api/funnels/:id returns 404 for cross-org funnel', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { funnels: [], funnel_pages: [] },
    })
    await request(emptyApp.getHttpServer())
      .patch(`/api/funnels/${FUNNEL_ID}`)
      .set('x-org-id', ORG_B)
      .send({ name: 'x' })
      .expect(404)
    await emptyApp.close()
  })

  it('DELETE /api/funnels/:id returns 404 for cross-org funnel', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { funnels: [], funnel_pages: [] },
    })
    await request(emptyApp.getHttpServer())
      .delete(`/api/funnels/${FUNNEL_ID}`)
      .set('x-org-id', ORG_B)
      .expect(404)
    await emptyApp.close()
  })
})
