import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrgTestApp, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const MISSION_ID = '33333333-3333-4333-8333-333333333333'

function missionRow(orgId: string) {
  return {
    id: MISSION_ID,
    org_id: orgId,
    user_id: TEST_USER.id,
    title: 'Org scope mission',
    brief: null,
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_agent_key: null,
    current_agent_key: null,
    progress_notes: null,
    plan_id: null,
    correlation_id: '00000000-0000-4000-8000-000000000001',
    idempotency_key: 'idempotency-key-mission-org-scope',
    retry_count: 0,
    input: {},
    campaign_id: null,
    parent_mission_id: null,
    scheduled_at: null,
    created_at: '2026-04-14T12:00:00.000Z',
    updated_at: '2026-04-14T12:00:00.000Z',
    error: null,
    output: null,
    completed_at: null,
    started_at: null,
    sort_order: 0,
  }
}

describe('Org Scoping: Missions', () => {
  describe('core CRUD + agents list', () => {
    let app: INestApplication

    beforeAll(async () => {
      const { app: a } = await createOrgTestApp({
        orgId: ORG_A,
        tableData: {
          missions: [missionRow(ORG_A)],
          agents_registry: [
            {
              agent_key: 'hr',
              org_id: ORG_A,
              user_id: null,
              name: 'Jaime',
              sort_order: 0,
              created_at: '2026-04-14T12:00:00.000Z',
              config: {},
            },
          ],
        },
      })
      app = a
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('GET /api/missions list is constrained to current org scope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/missions')
        .set('x-org-id', ORG_A)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.some((m: { id: string }) => m.id === MISSION_ID)).toBe(true)
    })

    it('GET /api/missions/:id returns 404 for cross-org mission', async () => {
      const { app: emptyApp } = await createOrgTestApp({
        orgId: ORG_B,
        tableData: { missions: [] },
      })
      await request(emptyApp.getHttpServer())
        .get(`/api/missions/${MISSION_ID}`)
        .set('x-org-id', ORG_B)
        .expect(404)
      await emptyApp.close()
    })

    it('PATCH /api/missions/:id/status returns 404 for cross-org mission', async () => {
      const { app: emptyApp } = await createOrgTestApp({
        orgId: ORG_B,
        tableData: { missions: [] },
      })
      await request(emptyApp.getHttpServer())
        .patch(`/api/missions/${MISSION_ID}/status`)
        .set('x-org-id', ORG_B)
        .send({ status: 'in_progress' })
        .expect(404)
      await emptyApp.close()
    })

    it('GET /api/agents returns agents in org scope (empty for other org)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/agents')
        .set('x-org-id', ORG_A)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.some((a: { agent_key: string }) => a.agent_key === 'hr')).toBe(true)

      const { app: emptyApp } = await createOrgTestApp({
        orgId: ORG_B,
        tableData: { agents_registry: [] },
      })
      const emptyRes = await request(emptyApp.getHttpServer())
        .get('/api/agents')
        .set('x-org-id', ORG_B)
        .expect(200)
      expect(emptyRes.body).toEqual([])
      await emptyApp.close()
    })

    it.todo(
      'GET /api/agents/:agentKey/skills — repository uses PostgREST .or(); extend filterable mock if we need non-empty assertions',
    )
    it.todo(
      'GET /api/agents/:agentKey/workflows — same .or() filter chain as skills; add when mock supports or() filtering',
    )
  })

  describe('cross-user visibility within org', () => {
    it.todo('org member can list missions created by another org member on a shared campaign')
    it.todo('org member can view detail of a mission whose user_id is the campaign owner')
    it.todo('org member with edit permission can update a mission created by another org member')
    it.todo(
      'org member with edit permission can add a comment to a mission owned by another member',
    )
    it.todo('org member with edit permission can retry a failed mission owned by another member')
    it.todo('org member with edit permission can delete a mission owned by another member')
    it.todo('mission created on org campaign gets user_id of campaign owner, not the creator')
    it.todo('mission logs are visible to all org members with campaign view access')
  })

  describe('notifications org scoping', () => {
    it.todo(
      'Requires user_notifications rows + read/unread routes — implement when notification fixtures are shared (GET/POST/PATCH/DELETE on /api/missions/notifications*)',
    )
    it.todo('POST notifications/read-all with org header only marks org rows read')
    it.todo('DELETE notifications/read with org header only deletes org read notifications')
    it.todo('GET notifications/unread-count respects org context')
    it.todo('PATCH notifications/:id/read with org header only updates org-scoped row')
  })

  describe('awareness points org scoping', () => {
    it.todo(
      'Requires agent_awareness_points fixtures — implement GET/POST /api/agents/awareness-points* with org header',
    )
    it.todo('POST agents/awareness-points/read-all with org header only marks org rows read')
  })
})
