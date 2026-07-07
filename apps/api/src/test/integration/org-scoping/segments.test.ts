import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrgTestApp } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SEGMENT_ID = '55555555-5555-4555-8555-555555555555'

describe('Org Scoping: Segments', () => {
  let app: INestApplication

  beforeAll(async () => {
    const { app: a } = await createOrgTestApp({
      orgId: ORG_A,
      tableData: {
        segments: [
          {
            id: SEGMENT_ID,
            org_id: ORG_A,
            user_id: 'test-user-id',
            name: 'Org A segment',
            description: null,
            filters: {},
            lead_count: 0,
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

  it('GET /api/segments list is constrained to current org scope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/segments')
      .set('x-org-id', ORG_A)
      .expect(200)
    expect(res.body.segments).toBeDefined()
    expect(Array.isArray(res.body.segments)).toBe(true)
    expect(res.body.segments.some((s: { id: string }) => s.id === SEGMENT_ID)).toBe(true)
  })

  it('GET /api/segments/:id returns 404 for cross-org segment', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { segments: [] },
    })
    await request(emptyApp.getHttpServer())
      .get(`/api/segments/${SEGMENT_ID}`)
      .set('x-org-id', ORG_B)
      .expect(404)
    await emptyApp.close()
  })

  it('PUT /api/segments/:id returns 404 for cross-org segment', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { segments: [] },
    })
    await request(emptyApp.getHttpServer())
      .put(`/api/segments/${SEGMENT_ID}`)
      .set('x-org-id', ORG_B)
      .send({
        name: 'nope',
        filters: {},
      })
      .expect(404)
    await emptyApp.close()
  })

  it('DELETE /api/segments/:id returns 404 for cross-org segment', async () => {
    const { app: emptyApp } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: { segments: [] },
    })
    await request(emptyApp.getHttpServer())
      .delete(`/api/segments/${SEGMENT_ID}`)
      .set('x-org-id', ORG_B)
      .expect(404)
    await emptyApp.close()
  })
})
