import { describe, expect, it, vi } from 'vitest'
import { TaskAgentSuggestionsService } from './task-agent-suggestions.service'

describe('TaskAgentSuggestionsService post-call delivery', () => {
  it('loads the post-call skill and returns one structured Slack draft', async () => {
    const runtimeReadiness = { ensureRuntimeReady: vi.fn().mockResolvedValue(undefined) }
    const inputService = {
      resolveTaskSlashSkills: vi.fn().mockResolvedValue([
        {
          key: 'post-call-delivery',
          name: 'Post-call delivery',
          markdown_content: 'Write a human recap and preserve supplied owners.',
          requiredSkillFiles: [
            {
              skillKey: 'post-call-delivery',
              filePath: 'skills/post-call-delivery/SKILL.md',
              checksum: 'abc',
            },
          ],
        },
      ]),
      buildSlashSkillContext: vi.fn().mockReturnValue('POST CALL SKILL CONTEXT'),
    }
    const openClaw = {
      streamCompletion: vi.fn().mockImplementation(async ({ send }) => {
        await send('content_delta', {
          content: JSON.stringify({
            message: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — review reporting',
            rationale: 'Keeps the agreed owner visible.',
            context_sources: ['meeting summary', 'follow-up records'],
          }),
        })
        return { content: '' }
      }),
    }
    const repository = {
      client: {},
      loadPostCallMeetingContext: vi.fn().mockResolvedValue({
        agenda: { title: 'Agenda', body: 'Review webinar performance and decide next test.' },
        recap: { title: 'Recap', body: 'The team approved the new hook.' },
        transcripts: [{ title: 'Transcript', body: 'Client: Ship the hook by Friday.' }],
      }),
    }
    const brainContext = {
      buildFullContext: vi.fn().mockResolvedValue('CLIENT BRAIN: prefers weekly reporting'),
    }
    const service = new TaskAgentSuggestionsService(
      repository as never,
      openClaw as never,
      {
        resolveConversationRuntime: vi.fn().mockResolvedValue({
          agentKey: 'vibey',
          gatewayAgentId: 'vibey',
        }),
        buildChatSessionKey: vi.fn().mockReturnValue('post-call-session'),
      } as never,
      runtimeReadiness as never,
      inputService as never,
      brainContext as never,
    )

    await expect(
      service.draftPostCall({
        space_id: 'space-1',
        owner_user_id: 'user-1',
        org_id: 'org-1',
        payload: { call: { id: 'meeting-1', title: 'Ops sync' }, follow_ups: [] },
      }),
    ).resolves.toEqual({
      draft: {
        message: 'Good connecting today.\n\n*Next steps*\n• *Dylan* — review reporting',
        rationale: 'Keeps the agreed owner visible.',
        context_sources: ['meeting summary', 'follow-up records'],
      },
    })

    expect(inputService.resolveTaskSlashSkills).toHaveBeenCalledWith({
      userId: 'user-1',
      agentKey: 'vibey',
      keys: ['post-call-delivery'],
      orgId: 'org-1',
    })
    expect(runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredSkillFiles: [expect.objectContaining({ skillKey: 'post-call-delivery' })],
      }),
    )
    expect(openClaw.streamCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining('POST CALL SKILL CONTEXT'),
        input: expect.arrayContaining([
          expect.objectContaining({ content: expect.stringContaining('PORTAL MEETING CONTEXT') }),
          expect.objectContaining({ content: expect.stringContaining('CLIENT BRAIN') }),
        ]),
      }),
    )
    expect(repository.loadPostCallMeetingContext).toHaveBeenCalledWith('meeting-1', 'space-1')
    expect(brainContext.buildFullContext).toHaveBeenCalled()
  })

  it('fails clearly when the database-backed skill is unavailable', async () => {
    const service = new TaskAgentSuggestionsService(
      { client: {} } as never,
      {} as never,
      {
        resolveConversationRuntime: vi.fn().mockResolvedValue({
          agentKey: 'vibey',
          gatewayAgentId: 'vibey',
        }),
      } as never,
      {} as never,
      {
        resolveTaskSlashSkills: vi.fn().mockResolvedValue([]),
      } as never,
    )

    await expect(
      service.draftPostCall({
        space_id: 'space-1',
        owner_user_id: 'user-1',
        org_id: 'org-1',
        payload: {},
      }),
    ).rejects.toThrow('post-call-delivery skill is not available')
  })
})
