/**
 * Conversations Integration Tests — CRUD endpoints
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConversationsService } from '../../modules/conversations/services/conversations.service'
import { createTestApp } from './test-helpers'

describe('Conversations Integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  }, 30_000)
  afterAll(async () => {
    await app?.close()
  })

  describe('GET /api/conversations', () => {
    it('returns list', async () => {
      const svc = app.get(ConversationsService)
      vi.spyOn(svc, 'listConversations').mockResolvedValue([
        { id: 'conv-1', title: 'Test Chat', created_at: '2026-02-14' },
      ] as any)
      const res = await request(app.getHttpServer()).get('/api/conversations').expect(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].title).toBe('Test Chat')
      vi.restoreAllMocks()
    })
  })

  describe('POST /api/conversations', () => {
    it('creates a conversation', async () => {
      const svc = app.get(ConversationsService)
      vi.spyOn(svc, 'createConversation').mockResolvedValue({
        id: 'conv-new',
        title: 'New Chat',
        user_id: 'test-user-id',
      } as any)
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .send({ title: 'New Chat' })
        .expect(201)
      expect(res.body.id).toBe('conv-new')
      vi.restoreAllMocks()
    })

    it('creates with campaign_id', async () => {
      const svc = app.get(ConversationsService)
      const spy = vi.spyOn(svc, 'createConversation').mockResolvedValue({
        id: 'conv-camp',
        campaign_id: 'camp-123',
      } as any)
      await request(app.getHttpServer())
        .post('/api/conversations')
        .send({ title: 'Campaign', campaign_id: 'camp-123' })
        .expect(201)
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-id',
        expect.objectContaining({ campaign_id: 'camp-123' }),
        null,
      )
      vi.restoreAllMocks()
    })
  })

  describe('GET /api/conversations/:id/messages', () => {
    it('returns messages', async () => {
      const svc = app.get(ConversationsService)
      vi.spyOn(svc, 'getMessages').mockResolvedValue([
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi!' },
      ] as any)
      const res = await request(app.getHttpServer())
        .get('/api/conversations/conv-1/messages')
        .expect(200)
      expect(res.body).toHaveLength(2)
      vi.restoreAllMocks()
    })
  })

  describe('PATCH /api/conversations/:id', () => {
    it('updates title', async () => {
      const svc = app.get(ConversationsService)
      vi.spyOn(svc, 'updateConversation').mockResolvedValue({
        id: 'conv-1',
        title: 'Renamed',
      } as any)
      const res = await request(app.getHttpServer())
        .patch('/api/conversations/conv-1')
        .send({ title: 'Renamed' })
        .expect(200)
      expect(res.body.title).toBe('Renamed')
      vi.restoreAllMocks()
    })
  })

  describe('DELETE /api/conversations/:id', () => {
    it('deletes', async () => {
      const svc = app.get(ConversationsService)
      vi.spyOn(svc, 'deleteConversation').mockResolvedValue(undefined)
      const res = await request(app.getHttpServer()).delete('/api/conversations/conv-1').expect(200)
      expect(res.body.success).toBe(true)
      vi.restoreAllMocks()
    })
  })
})
