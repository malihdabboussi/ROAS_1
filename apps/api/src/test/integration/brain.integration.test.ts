/**
 * Brain Integration Tests — memory CRUD, search, stats
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { BrainImportJobsService } from '../../modules/brain/services/brain-import-jobs.service'
import { MemoriesService } from '../../modules/brain/services/memories.service'
import { createTestApp, TEST_USER } from './test-helpers'

describe('Brain Integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  }, 30_000)
  afterAll(async () => {
    await app?.close()
  })

  describe('POST /api/brain/remember', () => {
    it('enqueues a document remember import job', async () => {
      const importJobs = app.get(BrainImportJobsService)
      vi.spyOn(importJobs, 'enqueueDocumentRemember').mockResolvedValue({
        jobId: 'job-new',
        status: 'queued',
        deduped: false,
      } as any)
      const res = await request(app.getHttpServer())
        .post('/api/brain/remember')
        .send({ content: 'Important fact', memory_type: 'fact', tags: ['test'] })
        .expect(202)
      expect(res.body.jobId).toBe('job-new')
      expect(res.body.success).toBe(true)
      vi.restoreAllMocks()
    })

    it('passes source metadata into enqueueDocumentRemember', async () => {
      const importJobs = app.get(BrainImportJobsService)
      const spy = vi.spyOn(importJobs, 'enqueueDocumentRemember').mockResolvedValue({
        jobId: 'job-x',
        status: 'queued',
        deduped: false,
      } as any)
      await request(app.getHttpServer())
        .post('/api/brain/remember')
        .send({
          content: 'Something',
          source_type: 'document',
          source_id: 'src-123',
          source_title: 'My Source',
        })
        .expect(202)
      const callArgs = spy.mock.calls[0]
      expect(callArgs[0]).toBe(TEST_USER.id)
      expect(callArgs[1]).toMatchObject({
        content: 'Something',
        sourceType: 'document',
        sourceId: 'src-123',
        sourceTitle: 'My Source',
      })
      vi.restoreAllMocks()
    })
  })

  describe('POST /api/brain/search', () => {
    it('searches memories', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'searchMemories').mockResolvedValue({
        query: 'test',
        results: [{ id: 'mem-001', content: 'Test', similarity: 0.95 }],
        count: 1,
      } as any)
      const res = await request(app.getHttpServer())
        .post('/api/brain/search')
        .send({ query: 'test', limit: 5 })
        .expect(200)
      expect(res.body.results).toHaveLength(1)
      expect(res.body.results[0].similarity).toBeGreaterThan(0.9)
      vi.restoreAllMocks()
    })
  })

  describe('GET /api/brain/stats', () => {
    it('returns statistics', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'getStats').mockResolvedValue({ totalMemories: 42 } as any)
      const res = await request(app.getHttpServer()).get('/api/brain/stats').expect(200)
      expect(res.body.totalMemories).toBe(42)
      vi.restoreAllMocks()
    })
  })

  describe('GET /api/brain/health', () => {
    it('returns health', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'getHealth').mockResolvedValue({ status: 'ok' } as any)
      const res = await request(app.getHttpServer()).get('/api/brain/health').expect(200)
      expect(res.body.status).toBe('ok')
      vi.restoreAllMocks()
    })
  })

  describe('Memory CRUD', () => {
    it('GET /api/brain/memories/:id returns detail', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'getMemoryDetail').mockResolvedValue({
        id: 'mem-001',
        content: 'Test',
        connections: [],
      } as any)
      const res = await request(app.getHttpServer()).get('/api/brain/memories/mem-001').expect(200)
      expect(res.body.id).toBe('mem-001')
      vi.restoreAllMocks()
    })

    it('PATCH /api/brain/memories/:id updates', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'updateMemory').mockResolvedValue({ id: 'mem-001', content: 'Updated' } as any)
      const res = await request(app.getHttpServer())
        .patch('/api/brain/memories/mem-001')
        .send({ content: 'Updated' })
        .expect(200)
      expect(res.body.content).toBe('Updated')
      vi.restoreAllMocks()
    })

    it('DELETE /api/brain/memories/:id deletes', async () => {
      const svc = app.get(MemoriesService)
      vi.spyOn(svc, 'deleteMemory').mockResolvedValue(undefined)
      const res = await request(app.getHttpServer())
        .delete('/api/brain/memories/mem-001')
        .expect(200)
      expect(res.body.success).toBe(true)
      vi.restoreAllMocks()
    })
  })
})
