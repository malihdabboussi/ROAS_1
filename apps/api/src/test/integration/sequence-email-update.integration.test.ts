/**
 * Sequence email update — PATCH /api/sequences/:seqId/emails/:emailId
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMockSupabase, createTestApp, TEST_USER } from './test-helpers'

const SEQ_ID = 'c0000000-0000-4000-8000-000000000003'
const EMAIL_ID = 'd0000000-0000-4000-8000-000000000004'
const OTHER_SEQ_ID = 'e0000000-0000-4000-8000-000000000005'
const CAMPAIGN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function sequenceEmailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EMAIL_ID,
    sequence_id: SEQ_ID,
    subject: 'Updated subject',
    body: '<p>Updated body</p>',
    delay_hours: 48,
    order_index: 0,
    status: 'draft',
    metrics: {},
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-14T12:00:00Z',
    ...overrides,
  }
}

describe('Sequence Email Update Contract', () => {
  describe('happy path', () => {
    let app: INestApplication

    beforeAll(async () => {
      const row = sequenceEmailRow()
      const mockSupabase = createMockSupabase({
        sequences: {
          data: {
            id: SEQ_ID,
            user_id: TEST_USER.id,
            org_id: null,
            campaign_id: CAMPAIGN_ID,
            name: 'Test sequence',
            status: 'draft',
            sequence_emails: [],
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
          },
          error: null,
        },
        sequence_emails: { data: row, error: null },
      })
      app = await createTestApp(mockSupabase)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('PATCH /api/sequences/:seqId/emails/:emailId updates subject/body/delay_hours', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/sequences/${SEQ_ID}/emails/${EMAIL_ID}`)
        .send({ subject: 'Updated subject', body: '<p>Updated body</p>', delay_hours: 48 })
        .expect(200)
      expect(res.body.subject).toBe('Updated subject')
      expect(res.body.body).toBe('<p>Updated body</p>')
      expect(res.body.delay_hours).toBe(48)
    })

    it('returns full sequence_email row shape expected by frontend', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/sequences/${SEQ_ID}/emails/${EMAIL_ID}`)
        .send({ subject: 'S', body: 'B', delay_hours: 1, status: 'draft' })
        .expect(200)
      expect(res.body).toMatchObject({
        id: EMAIL_ID,
        sequence_id: SEQ_ID,
        subject: expect.any(String),
        body: expect.any(String),
        delay_hours: expect.any(Number),
        order_index: expect.any(Number),
        status: expect.any(String),
        metrics: expect.any(Object),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      })
    })
  })

  describe('404 — wrong sequence', () => {
    let app: INestApplication

    beforeAll(async () => {
      const mockSupabase = createMockSupabase({
        sequence_emails: {
          data: { id: EMAIL_ID, sequence_id: OTHER_SEQ_ID },
          error: null,
        },
      })
      app = await createTestApp(mockSupabase)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('returns 404 when email does not belong to the sequence', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sequences/${SEQ_ID}/emails/${EMAIL_ID}`)
        .send({ subject: 'Nope' })
        .expect(404)
    })
  })

  describe('org isolation (simulated RLS / parent chain)', () => {
    let app: INestApplication

    beforeAll(async () => {
      const mockSupabase = createMockSupabase({
        sequences: {
          data: {
            id: SEQ_ID,
            user_id: TEST_USER.id,
            org_id: 'f0000000-0000-4000-8000-000000000006',
            campaign_id: CAMPAIGN_ID,
            name: 'Org sequence',
          },
          error: null,
        },
        sequence_emails: {
          data: null,
          error: { message: 'No rows returned' },
        },
      })
      app = await createTestApp(mockSupabase)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('enforces org isolation through sequences.org_id parent chain', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sequences/${SEQ_ID}/emails/${EMAIL_ID}`)
        .send({ subject: 'Hidden' })
        .expect(404)
    })
  })
})
