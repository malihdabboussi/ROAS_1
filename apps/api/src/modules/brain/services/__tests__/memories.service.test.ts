import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MemoriesRepository } from '../../repositories/memories.repository'
import type { EmbeddingService } from '../embedding.service'
import { MemoriesService } from '../memories.service'

describe('MemoriesService', () => {
  let service: MemoriesService
  let mockRepo: Record<string, ReturnType<typeof vi.fn>>
  let mockEmbedding: Record<string, ReturnType<typeof vi.fn>>
  let mockBrainPermissions: Record<string, ReturnType<typeof vi.fn>>
  const mockSupabase = {} as any

  beforeEach(() => {
    mockRepo = {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      checkDuplicate: vi.fn(),
      createVersion: vi.fn(),
      getConnections: vi.fn(),
      getVersions: vi.fn(),
      getStats: vi.fn(),
      getHealthStats: vi.fn(),
      search: vi.fn(),
      createConnection: vi.fn(),
      deleteConnection: vi.fn(),
      listExtensionBrains: vi.fn(),
      listExtensionCampaigns: vi.fn(),
    }
    mockEmbedding = {
      getEmbedding: vi.fn(),
    }
    mockBrainPermissions = {
      listAccessibleBrains: vi.fn().mockResolvedValue([]),
    }
    service = new MemoriesService(
      mockRepo as unknown as MemoriesRepository,
      mockEmbedding as unknown as EmbeddingService,
      mockBrainPermissions as any,
    )
  })

  describe('createMemory', () => {
    it('should create a memory with content hash', async () => {
      mockRepo.checkDuplicate.mockResolvedValue(false)
      mockRepo.create.mockResolvedValue({ id: '1', content: 'test' })

      const result = await service.createMemory(mockSupabase, {
        content: 'Test memory content',
        memory_type: 'fact',
      })

      expect(result.id).toBe('1')
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          content: 'Test memory content',
          memory_type: 'fact',
          content_hash: expect.any(String),
        }),
        undefined,
      )
    })

    it('should reject duplicate memories', async () => {
      mockRepo.checkDuplicate.mockResolvedValue(true)

      await expect(
        service.createMemory(mockSupabase, {
          content: 'Duplicate',
          memory_type: 'fact',
        }),
      ).rejects.toThrow('Duplicate memory')
    })
  })

  describe('getMemory', () => {
    it('should return memory if found', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', content: 'test' })
      const result = await service.getMemory(mockSupabase, '1')
      expect(result.content).toBe('test')
    })

    it('should throw if not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.getMemory(mockSupabase, '999')).rejects.toThrow('Memory not found')
    })
  })

  describe('updateMemory', () => {
    it('should create version when content changes', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', content: 'old' })
      mockRepo.createVersion.mockResolvedValue({})
      mockRepo.update.mockResolvedValue({ id: '1', content: 'new' })

      await service.updateMemory(mockSupabase, '1', { content: 'new' })

      expect(mockRepo.createVersion).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          memory_id: '1',
          content_previous: 'old',
        }),
      )
    })

    it('should not create version when content unchanged', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', content: 'same' })
      mockRepo.update.mockResolvedValue({ id: '1' })

      await service.updateMemory(mockSupabase, '1', { tags: ['new-tag'] })

      expect(mockRepo.createVersion).not.toHaveBeenCalled()
    })

    it('should throw if memory not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.updateMemory(mockSupabase, '999', {})).rejects.toThrow(
        'Memory not found',
      )
    })
  })

  describe('deleteMemory', () => {
    it('should delete if exists', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' })
      mockRepo.delete.mockResolvedValue(undefined)
      await service.deleteMemory(mockSupabase, '1')
      expect(mockRepo.delete).toHaveBeenCalledWith(mockSupabase, '1')
    })

    it('should throw if not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.deleteMemory(mockSupabase, '999')).rejects.toThrow('Memory not found')
    })
  })

  describe('searchMemories', () => {
    it('should auto-generate embedding from query', async () => {
      mockEmbedding.getEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
      mockRepo.search.mockResolvedValue([{ id: '1', similarity: 0.9 }])

      const result = await service.searchMemories(mockSupabase, { query: 'test search' })
      expect(result.count).toBe(1)
      expect(mockEmbedding.getEmbedding).toHaveBeenCalledWith('test search', {
        taskType: 'RETRIEVAL_QUERY',
      })
    })

    it('should throw if no query and no embedding', async () => {
      await expect(service.searchMemories(mockSupabase, { query: '' })).rejects.toThrow(
        'Either query or query_embedding is required',
      )
    })

    it('should use provided embedding', async () => {
      mockRepo.search.mockResolvedValue([])
      const result = await service.searchMemories(mockSupabase, {
        query: 'test',
        query_embedding: [0.1, 0.2],
      })
      expect(mockEmbedding.getEmbedding).not.toHaveBeenCalled()
      expect(result.count).toBe(0)
    })
  })

  describe('getMemoryDetail', () => {
    it('should return memory with connections and versions', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', content: 'test' })
      mockRepo.getConnections.mockResolvedValue([
        { source_memory_id: '1', target_memory_id: '2', relationship: 'related' },
      ])
      mockRepo.findByIds.mockResolvedValue([{ id: '2', content: 'connected' }])
      mockRepo.getVersions.mockResolvedValue([])

      const result = await service.getMemoryDetail(mockSupabase, '1')
      expect(result.connected_memories).toHaveLength(1)
      expect(result.connections).toHaveLength(1)
    })
  })

  describe('listBrainsForExtension', () => {
    it('returns accessible brains and excludes general campaigns', async () => {
      mockBrainPermissions.listAccessibleBrains.mockResolvedValue([
        { id: 'brain-1', effective_level: 'edit' },
      ])
      mockRepo.listExtensionBrains.mockResolvedValue([
        {
          id: 'brain-1',
          name: 'Sales',
          org_id: 'org-1',
          scope: 'org',
        },
        {
          id: 'brain-2',
          name: 'Hidden',
          org_id: 'org-1',
          scope: 'org',
        },
      ])
      mockRepo.listExtensionCampaigns.mockResolvedValue([
        { id: 'campaign-1', name: 'Launch', config: { system_kind: 'funnel' } },
        { id: 'campaign-2', name: 'General', config: { system_kind: 'general' } },
      ])

      const brainsQuery: Record<string, any> = {
        select: vi.fn(() => brainsQuery),
        order: vi.fn(() => brainsQuery),
        eq: vi.fn(() => brainsQuery),
        is: vi.fn(() => brainsQuery),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: [
              {
                id: 'brain-1',
                name: 'Sales',
                org_id: 'org-1',
                scope: 'org',
              },
              {
                id: 'brain-2',
                name: 'Hidden',
                org_id: 'org-1',
                scope: 'org',
              },
            ],
            error: null,
          }).then(resolve),
      }
      const campaignsQuery: Record<string, any> = {
        select: vi.fn(() => campaignsQuery),
        is: vi.fn(() => campaignsQuery),
        neq: vi.fn(() => campaignsQuery),
        order: vi.fn(() => campaignsQuery),
        eq: vi.fn(() => campaignsQuery),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: [
              { id: 'campaign-1', name: 'Launch', config: { system_kind: 'funnel' } },
              { id: 'campaign-2', name: 'General', config: { system_kind: 'general' } },
            ],
            error: null,
          }).then(resolve),
      }
      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'ns_brains') return brainsQuery
          if (table === 'campaigns') return campaignsQuery
          throw new Error(`unexpected table: ${table}`)
        }),
      }

      await expect(
        service.listBrainsForExtension(supabase as never, 'user-1', {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'admin',
        }),
      ).resolves.toEqual({
        brains: [
          {
            id: 'brain-1',
            name: 'Sales',
            org_id: 'org-1',
            scope: 'org',
            effective_level: 'edit',
          },
        ],
        campaigns: [{ id: 'campaign-1', name: 'Launch', config: { system_kind: 'funnel' } }],
      })
    })
  })
})
