import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainImportJobsInputRepository } from '../../repositories/brain-import-jobs-input.repository'
import { EmotionalTaggingRepository } from '../../repositories/emotional-tagging.repository'
import { FeedbackRepository } from '../../repositories/feedback.repository'
import { MeetingIngestionRepository } from '../../repositories/meeting-ingestion.repository'
import { PendingCapturesRepository } from '../../repositories/pending-captures.repository'
import { ScholarContextRepository } from '../../repositories/scholar-context.repository'
import { SkIngestionRepository } from '../../repositories/sk-ingestion.repository'
import { BrainEvidenceIngestionService } from '../brain-evidence-ingestion.service'
import { BrainImportJobsService } from '../brain-import-jobs.service'
import { DocumentIngestionService } from '../document-ingestion.service'
import { EmotionalTaggingService } from '../emotional-tagging.service'
import { FeedbackService } from '../feedback.service'
import { MeetingIngestionService } from '../meeting-ingestion.service'
import { PendingCapturesService } from '../pending-captures.service'
import { ScholarContextService } from '../scholar-context.service'
import { SkIngestionService } from '../sk-ingestion.service'

function createSupabase(
  queriesByTable: Record<string, Array<Record<string, unknown>>> = {},
  rpcResults: Record<string, unknown> = {},
) {
  return {
    from: vi.fn((table: string) => {
      const query = queriesByTable[table]?.shift()
      if (!query) throw new Error(`unexpected table: ${table}`)
      return query
    }),
    rpc: vi.fn((name: string) => {
      const result = rpcResults[name]
      if (!result) throw new Error(`unexpected rpc: ${name}`)
      return Promise.resolve(result)
    }),
  }
}

describe('FeedbackService', () => {
  it('submits feedback and aggregates boost ratings by snapshot', async () => {
    const insertQuery: Record<string, any> = {
      insert: vi.fn(() => insertQuery),
      select: vi.fn(() => insertQuery),
      single: vi.fn().mockResolvedValue({ data: { id: 'feedback-1' }, error: null }),
    }
    const boostQuery: Record<string, any> = {
      select: vi.fn(() => boostQuery),
      eq: vi.fn(() => boostQuery),
      in: vi.fn().mockResolvedValue({
        data: [
          { snapshot_id: 'snap-1', rating: 1 },
          { snapshot_id: 'snap-1', rating: -1 },
          { snapshot_id: 'snap-2', rating: 1 },
        ],
        error: null,
      }),
    }
    const supabase = createSupabase({ ns_search_feedback: [insertQuery, boostQuery] })
    const service = new FeedbackService(new FeedbackRepository())

    await expect(
      service.submitFeedback(supabase as never, 'profile-1', {
        snapshotId: 'snap-1',
        query: 'pricing',
        rating: 1,
        searchMode: 'semantic',
        position: 2,
        comment: 'useful',
      }),
    ).resolves.toEqual({ id: 'feedback-1' })

    await expect(
      service.getBoostMap(supabase as never, 'profile-1', ['snap-1', 'snap-2']),
    ).resolves.toEqual({ 'snap-1': 0, 'snap-2': 1 })
    expect(insertQuery.insert).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      query: 'pricing',
      snapshot_id: 'snap-1',
      rating: 1,
      search_mode: 'semantic',
      position: 2,
      comment: 'useful',
    })
  })
})

describe('PendingCapturesService', () => {
  it('accepts pending captures by creating snapshots and marking the capture accepted', async () => {
    const fetchQuery: Record<string, any> = {
      select: vi.fn(() => fetchQuery),
      eq: vi.fn(() => fetchQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'capture-1',
          brain_id: 'brain-1',
          profile_id: 'user-1',
          agent_id: 'agent-1',
          session_id: 'session-1',
          source_type: 'conversation',
          context: { channel: 'chat' },
          snapshots: [{ title: 'Signal', content: 'Customer asked for annual pricing' }],
        },
        error: null,
      }),
    }
    const insertSnapshotQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const updateQuery: Record<string, any> = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    const supabase = createSupabase({
      ns_pending_captures: [fetchQuery, updateQuery],
      ns_snapshots: [insertSnapshotQuery],
    })
    const service = new PendingCapturesService(new PendingCapturesRepository())

    await expect(service.acceptCapture(supabase as never, 'user-1', 'capture-1')).resolves.toEqual({
      accepted: true,
      snapshotsCreated: 1,
    })

    expect(insertSnapshotQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-1',
        name: 'Signal',
        core: 'Customer asked for annual pricing',
        agent_id: 'agent-1',
        session_id: 'session-1',
      }),
    )
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted', reviewed_at: expect.any(String) }),
    )
  })
})

describe('ScholarContextService', () => {
  it('builds extraction context from related memories and brain stats', async () => {
    const memoriesQuery: Record<string, any> = {
      select: vi.fn(() => memoriesQuery),
      eq: vi.fn().mockResolvedValue({ count: 7, data: [], error: null }),
    }
    const skQuery: Record<string, any> = {
      select: vi.fn(() => skQuery),
      limit: vi.fn().mockResolvedValue({
        count: 3,
        data: [{ domain: 'sales' }, { domain: 'sales' }, { domain: 'support' }],
        error: null,
      }),
    }
    const supabase = createSupabase(
      { ns_memories: [memoriesQuery], ns_sk_entries: [skQuery] },
      {
        search_ns_memories: {
          data: [{ content: 'Existing sales insight', memory_type: 'fact', significance: 0.8 }],
          error: null,
        },
      },
    )
    const embedding = { getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]) }
    const service = new ScholarContextService(embedding as never, new ScholarContextRepository())

    await expect(
      service.gatherExtractionContext(
        supabase as never,
        'user-1',
        'New sales playbook content',
        'document',
        'org-1',
      ),
    ).resolves.toEqual({
      relatedMemories: [
        { content: 'Existing sales insight', memory_type: 'fact', significance: 0.8 },
      ],
      brainStats: { totalMemories: 7, totalSkEntries: 3, topDomains: ['sales', 'support'] },
      sourceType: 'document',
    })
  })
})

describe('EmotionalTaggingService', () => {
  it('clamps Gemini emotion output before updating memory metadata', async () => {
    const updateQuery: Record<string, any> = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    const supabase = createSupabase({ ns_memories: [updateQuery] })
    const embedding = {
      callGemini: vi.fn().mockResolvedValue(
        JSON.stringify({
          source_emotion: 'Confidence',
          emotional_valence: 2,
          emotional_intensity: -0.25,
          speaker_intent: 'Reassurance',
        }),
      ),
    }
    const service = new EmotionalTaggingService(
      embedding as never,
      new EmotionalTaggingRepository(),
    )

    await service.tagMemory(supabase as never, 'memory-1', 'We can solve this.', 'user-1', 'org-1')

    expect(updateQuery.update).toHaveBeenCalledWith({
      source_emotion: 'confidence',
      emotional_valence: 1,
      emotional_intensity: 0,
      speaker_intent: 'reassurance',
    })
  })
})

describe('BrainEvidenceIngestionService', () => {
  const originalFlag = process.env.BRAIN_EVIDENCE_CHUNKS

  afterEach(() => {
    process.env.BRAIN_EVIDENCE_CHUNKS = originalFlag
  })

  it('upserts non-empty evidence chunks only when the feature flag is enabled', async () => {
    process.env.BRAIN_EVIDENCE_CHUNKS = '1'
    const supabase = {}
    const embedding = { getEmbedding: vi.fn().mockResolvedValue([0.3, 0.4]) }
    const repository = {
      getServiceClient: vi.fn(() => supabase),
      upsertEpisode: vi.fn().mockResolvedValue({ data: { id: 'episode-1' }, error: null }),
      upsertEvidenceChunk: vi.fn().mockResolvedValue({ error: null }),
    }
    const service = new BrainEvidenceIngestionService(embedding as never, repository as never)

    await expect(
      service.writeEvidenceChunks(supabase as never, {
        brainId: 'brain-1',
        family: 'agent',
        ownerId: 'user-1',
        orgId: 'org-1',
        sourceType: 'document',
        sourceTitle: 'Guide',
        ingestionPath: 'api',
        chunks: [' Useful content ', '   '],
      }),
    ).resolves.toEqual({ chunks_inserted: 1, episode_id: 'episode-1' })

    expect(repository.upsertEvidenceChunk).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        brain_id: 'brain-1',
        source_type: 'document',
        content: 'Useful content',
        embedding: '[0.3,0.4]',
      }),
    )
  })
})

describe('DocumentIngestionService', () => {
  const originalFlag = process.env.BRAIN_EVIDENCE_CHUNKS

  afterEach(() => {
    process.env.BRAIN_EVIDENCE_CHUNKS = originalFlag
  })

  it('resolves the default user brain before writing evidence chunks', async () => {
    process.env.BRAIN_EVIDENCE_CHUNKS = '1'
    const brainQuery: Record<string, any> = {
      select: vi.fn(() => brainQuery),
      eq: vi.fn(() => brainQuery),
      is: vi.fn(() => brainQuery),
      order: vi.fn(() => brainQuery),
      limit: vi.fn(() => brainQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brain-1' }, error: null }),
    }
    const supabase = createSupabase({ ns_brains: [brainQuery] })
    const evidenceIngestion = {
      writeEvidenceChunks: vi.fn().mockResolvedValue({ chunks_inserted: 1, episode_id: null }),
    }
    const memoriesRepo = {
      resolveDefaultBrainId: vi.fn().mockResolvedValue('brain-1'),
      checkDuplicate: vi.fn(),
      create: vi.fn(),
      search: vi.fn(),
      createConnection: vi.fn(),
    }
    const service = new DocumentIngestionService(
      {
        callGemini: vi.fn().mockResolvedValue('[]'),
        getEmbedding: vi.fn(),
      } as never,
      { registerForOwner: vi.fn().mockResolvedValue({ duplicate: false }) } as never,
      memoriesRepo as never,
      { tagMemory: vi.fn() } as never,
      {
        gatherExtractionContext: vi.fn().mockResolvedValue({}),
        buildContextBlock: vi.fn().mockReturnValue(''),
      } as never,
      evidenceIngestion as never,
    )

    await service.ingest(supabase as never, {
      text: 'A useful paragraph with enough detail to pass chunk filtering.\n\nAnother useful paragraph for evidence.',
      ownerId: 'user-1',
      sourceType: 'document',
      orgId: null,
    })

    expect(evidenceIngestion.writeEvidenceChunks).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        brainId: 'brain-1',
        ownerId: 'user-1',
        sourceType: 'document',
        ingestionPath: 'atlas_import',
      }),
    )
  })
})

describe('MeetingIngestionService', () => {
  it('skips already processed meeting sessions before dedupe or crystallization', async () => {
    const supabase = {}
    const crystallization = { crystallize: vi.fn() }
    const contentDedupe = { registerForOwner: vi.fn() }
    const memoriesRepo = { findSessionByKey: vi.fn().mockResolvedValue({ id: 'session-1' }) }
    const service = new MeetingIngestionService(
      crystallization as never,
      contentDedupe as never,
      memoriesRepo as never,
      new MeetingIngestionRepository(),
    )
    ;(service as any).getAdminClient = () => supabase

    await expect(
      service.ingest({
        provider: 'fathom',
        meetingId: 'meeting-1',
        userId: 'user-1',
        title: 'Sales call',
        transcript: [{ speaker: 'A', text: 'hello' }],
      }),
    ).resolves.toEqual({
      status: 'skipped',
      snapshots_created: 0,
      memories_created: 0,
      reason: 'Already processed',
    })
    expect(contentDedupe.registerForOwner).not.toHaveBeenCalled()
    expect(crystallization.crystallize).not.toHaveBeenCalled()
  })
})

describe('SkIngestionService', () => {
  it('returns duplicate without creating a source after ownership succeeds', async () => {
    const brainQuery: Record<string, any> = {
      select: vi.fn(() => brainQuery),
      eq: vi.fn(() => brainQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brain-1' }, error: null }),
    }
    const supabase = createSupabase({ ns_brains: [brainQuery] })
    const service = new SkIngestionService(
      { getEmbedding: vi.fn(), callGemini: vi.fn() } as never,
      { registerForBrain: vi.fn().mockResolvedValue({ duplicate: true }) } as never,
      { gatherExtractionContext: vi.fn(), buildContextBlock: vi.fn() } as never,
      { assertCanTrainBrain: vi.fn() } as never,
      new SkIngestionRepository(),
    )

    await expect(
      service.ingest(supabase as never, 'user-1', {
        text: 'Knowledge text',
        sourceType: 'note',
        title: 'Note',
        brainId: 'brain-1',
      }),
    ).resolves.toEqual({ sourceId: '', entriesInserted: 0, duplicate: true })

    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})

describe('BrainImportJobsInputBase Slack mission input', () => {
  it('builds Slack mission input from connected integration and formatted threads', async () => {
    const integrationQuery: Record<string, any> = {
      select: vi.fn(() => integrationQuery),
      eq: vi.fn(() => integrationQuery),
      limit: vi.fn(() => integrationQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { access_token: 'xoxb-token' },
        error: null,
      }),
    }
    const admin = createSupabase({ user_integrations: [integrationQuery] })
    const slackService = {
      pullChannelHistorySince: vi
        .fn()
        .mockResolvedValue([{ user: 'U1', text: 'Long message body' }]),
      expandThreads: vi
        .fn()
        .mockResolvedValue([[{ user: 'U1', text: 'Long message body with more context' }]]),
      formatThreadsAsBlob: vi.fn().mockReturnValue('formatted slack content'),
    }
    const senderResolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(new Map([['U1', { contactId: null }]])),
    }
    const service = new BrainImportJobsService(
      { get: vi.fn() } as any,
      undefined as any,
      undefined as any,
      undefined as any,
      new BrainImportJobsInputRepository(),
    )
    ;(service as any).getAdminClient = () => admin
    ;(service as any).getSlackService = () => slackService
    ;(service as any).getSlackSenderResolver = () => senderResolver

    const payload = {
      isFork: true,
      mappingId: 'mapping-1',
      mappingUserId: 'mapping-user',
      teamId: 'team-1',
      channelId: 'channel-1',
      channelName: 'sales',
      periodStartTs: '1710000000.000000',
      targetKind: 'agent',
      targetBrainId: 'brain-1',
    }

    await expect(
      (service as any).buildMissionInput(
        {
          id: 'job-1',
          user_id: 'user-1',
          org_id: 'org-1',
          job_type: 'slack_period_import',
          title: 'Slack import',
          dedupe_key: 'd',
          payload,
          status: 'processing',
          attempts: 1,
          max_attempts: 3,
          next_attempt_at: new Date().toISOString(),
          last_error: null,
          result: null,
          completed_at: null,
          chunks_total: null,
          chunks_completed: null,
        },
        payload,
      ),
    ).resolves.toMatchObject({
      targetBrain: 'agent',
      contentType: 'slack_period',
      title: 'Analyze Slack #sales',
      input: {
        brainId: 'brain-1',
        content: 'formatted slack content',
        sourceId: 'slack:team-1:channel-1:1710000000.000000',
      },
    })

    expect(slackService.pullChannelHistorySince).toHaveBeenCalledWith(
      'xoxb-token',
      'channel-1',
      '1710000000.000000',
    )
    expect(senderResolver.resolveSlackSenders).toHaveBeenCalledWith(admin, {
      botToken: 'xoxb-token',
      userId: 'mapping-user',
      orgId: 'org-1',
      slackUserIds: ['U1'],
    })
  })
})
