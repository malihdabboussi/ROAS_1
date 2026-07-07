import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationsRepository } from '../../../conversations/repositories/conversations.repository'
import { ChatContextRepository } from '../../repositories/chat-context.repository'
import { ChatSlashCommandService } from '../chat-slash-command.service'
import { ChatService } from '../chat.service'

/** Supabase chain for ConversationsRepository.findByIdScoped (user scope, org_id null) */
function makeSupabaseMockForUserScoped(singleResult: { data: unknown; error: unknown | null }) {
  const chain: any = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(singleResult),
  }
  return chain
}

/** Supabase chain for ConversationsRepository.findByIdOrgScoped */
function makeSupabaseMockForOrgScoped(maybeSingleResult: { data: unknown; error: unknown | null }) {
  const chain: any = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
  }
  return chain
}

function makeService(level: 'view' | 'edit' | 'admin' | null = 'admin') {
  return new ChatService(
    {} as any,
    new ConversationsRepository(),
    {} as any,
    {} as any,
    {} as any,
    {
      getActiveRunForConversation: vi.fn(async () => null),
      startRun: vi.fn(async () => undefined),
      appendEvent: vi.fn(async () => null),
      markRunDone: vi.fn(async () => undefined),
      markRunFailed: vi.fn(async () => undefined),
      recordRunRouting: vi.fn(async () => undefined),
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {
      resolveEffectiveLevel: vi.fn().mockResolvedValue(level),
    } as any,
    {} as any,
    { recordCompletion: vi.fn(async () => undefined) } as any,
    { recordCompletion: vi.fn(async () => undefined) } as any,
  )
}

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('slash skill resolution', () => {
    it('uses runtime skill scope and carries required files for readiness', async () => {
      const resolveRuntimeSkillScope = vi.fn(async () => ({
        skills: [
          {
            skill_key: 'kt-carousel-producer',
            name: 'Kevin Trudeau Carousel Producer',
            markdown_content: '# KT skill',
          },
        ],
        resources: [
          {
            skill_key: 'kt-carousel-producer',
            file_path: 'references/kt-design-system.md',
            content: '# ref',
          },
        ],
        requiredSkillFiles: [
          {
            skillKey: 'kt-carousel-producer',
            kind: 'skill',
            filePath: 'skills/kt-carousel-producer/SKILL.md',
          },
          {
            skillKey: 'kt-carousel-producer',
            kind: 'resource',
            filePath: 'skills/kt-carousel-producer/references/kt-design-system.md',
          },
        ],
      }))
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        or: vi.fn(() => query),
        is: vi.fn(() => query),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      }
      const service = new ChatSlashCommandService(
        { client: { from: vi.fn(() => query) } } as any,
        { resolveRuntimeSkillScope } as any,
        new ChatContextRepository(),
      )

      const resolved = await service.resolveSlashCommands(
        'user-1',
        'vibey',
        ['kt-carousel-producer'],
        'org-1',
      )

      expect(resolveRuntimeSkillScope).toHaveBeenCalledWith({
        agentKey: 'vibey',
        userId: 'user-1',
        orgId: 'org-1',
        skillKeys: ['kt-carousel-producer'],
      })
      expect(resolved).toEqual([
        {
          key: 'kt-carousel-producer',
          type: 'skill',
          name: 'Kevin Trudeau Carousel Producer',
          markdown_content: '# KT skill',
          requiredSkillFiles: [
            {
              skillKey: 'kt-carousel-producer',
              kind: 'skill',
              filePath: 'skills/kt-carousel-producer/SKILL.md',
            },
            {
              skillKey: 'kt-carousel-producer',
              kind: 'resource',
              filePath: 'skills/kt-carousel-producer/references/kt-design-system.md',
            },
          ],
        },
      ])
    })
  })

  describe('verifyConversationAccess', () => {
    it('returns true when conversation exists for user', async () => {
      const service = makeService('admin')
      const supabase = makeSupabaseMockForUserScoped({
        data: { id: 'conv-1', user_id: 'user-1' },
        error: null,
      })
      const result = await service.verifyConversationAccess(supabase as any, 'conv-1', 'user-1')
      expect(result).toBe(true)
    })

    it('returns false when conversation is null (not found)', async () => {
      const service = makeService(null)
      const supabase = makeSupabaseMockForUserScoped({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      })
      const result = await service.verifyConversationAccess(supabase as any, 'conv-1', 'user-1')
      expect(result).toBe(false)
    })

    it('returns false on database error', async () => {
      const service = makeService(null)
      const supabase = makeSupabaseMockForOrgScoped({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      })
      const result = await service.verifyConversationAccess(
        supabase as any,
        'conv-1',
        'user-1',
        'org-1',
      )
      expect(result).toBe(false)
    })
  })
})
