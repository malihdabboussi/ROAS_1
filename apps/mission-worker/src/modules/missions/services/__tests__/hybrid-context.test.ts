import { describe, expect, it, vi } from 'vitest'
import { MissionContextService } from '../context/mission-context.service'
import { evaluateSubtaskOutputAlignment } from '../phases/mission-execute-helpers'
import { MissionExecutePhaseService } from '../phases/mission-execute-phase.service'

function createContextService() {
  const configService = { get: vi.fn() } as any
  const agentRuntimeService = { resolveRuntimeAgent: vi.fn() } as any
  return new MissionContextService(configService, agentRuntimeService) as any
}

function createExecuteService(contextService: any) {
  const databaseService = {
    getClient: vi.fn(),
  } as any
  const stateRepo = {} as any
  const deliverablesRepo = {} as any
  const openclawGateway = {
    assertMissionHasCredits: vi.fn().mockResolvedValue(undefined),
  } as any
  const jsonService = {
    tryParseJson: vi.fn(),
  } as any
  const support = {} as any
  const abortRegistry = {} as any
  const broadcast = {} as any
  return new MissionExecutePhaseService(
    databaseService,
    stateRepo,
    deliverablesRepo,
    openclawGateway,
    contextService,
    jsonService,
    support,
    abortRegistry,
    broadcast,
  ) as any
}

describe('MissionsService hybrid context helpers', () => {
  it('buildSubtaskIntentDelta prioritizes latest user intent first block', () => {
    const contextService = createContextService()
    const service = createExecuteService(contextService)
    const delta = service['buildSubtaskIntentDelta'](
      {
        title: 'Create PDF from approved blog',
        status: 'revision',
        feedback: 'Do not rewrite blog copy',
      },
      'Please only convert to PDF and keep the original copy intact',
    )

    expect(delta).toContain('INTENT_DELTA')
    expect(delta).toContain('Current subtask focus: Create PDF from approved blog')
    expect(delta).toContain('Revision requested: Do not rewrite blog copy')
    expect(delta).toContain(
      'Latest user intent: Please only convert to PDF and keep the original copy intact',
    )
  })

  it('extractTopRelevantCampaignFacts returns bounded bullet facts', () => {
    const service = createContextService()
    const context = [
      'Campaign Context:',
      '- purpose: Launch sleep offer',
      '- tone: calm, expert',
      '- avatar: stressed professionals',
      '- offer: Sleep reset protocol',
      '- constraint: no medical claims',
    ].join('\n')

    const facts = service.extractTopRelevantCampaignFacts(context, 3)
    expect(facts).toEqual([
      'purpose: Launch sleep offer',
      'tone: calm, expert',
      'avatar: stressed professionals',
    ])
  })

  it('deduplicates canonical selected Offer and Avatar ids from campaign context', () => {
    const service = createContextService()

    expect(
      service['extractSelectedContextIds'](
        { selected_offer_ids: ['offer-1', '', 'offer-1', 'offer-2'] },
        'selected_offer_ids',
      ),
    ).toEqual(['offer-1', 'offer-2'])
    expect(
      service['extractSelectedContextIds'](
        { selected_avatar_ids: 'avatar-1' },
        'selected_avatar_ids',
      ),
    ).toEqual([])
  })

  it('reports canonical selected Offer and Avatar ids that no longer resolve', () => {
    const service = createContextService()

    expect(
      service['unresolvedSelectedContextIds'](
        ['offer-approved', 'offer-missing'],
        [{ id: 'offer-approved' }],
      ),
    ).toEqual(['offer-missing'])
    expect(service['unresolvedSelectedContextIds'](['avatar-missing'], null)).toEqual([
      'avatar-missing',
    ])
  })

  it('evaluateSubtaskOutputAlignment fails when latest intent is missing', () => {
    const result = evaluateSubtaskOutputAlignment(
      { title: 'Design PDF', status: 'pending' },
      {
        content:
          'This deliverable formats the approved blog into a polished PDF layout for distribution.',
        summary: 'PDF prepared from approved content',
      },
      'Add testimonial section and CTA button',
    )

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('latest user intent')
  })

  it('evaluateSubtaskOutputAlignment passes when revision feedback is reflected', () => {
    const result = evaluateSubtaskOutputAlignment(
      {
        title: 'Revise headline',
        status: 'revision',
        feedback: 'Include conversion-focused CTA wording',
      },
      {
        content:
          'Updated copy includes conversion-focused CTA wording and keeps the rest of the approved structure intact.',
        summary: 'Revision applied with CTA wording',
      },
      '',
    )

    expect(result.ok).toBe(true)
  })

  it('subtask prompt enforces targeted gap-fetch policy', async () => {
    const contextService = createContextService()
    contextService.buildCampaignContext = vi
      .fn()
      .mockResolvedValue(
        'Campaign Context:\n- purpose: Launch PDF lead magnet\n- tone: concise and persuasive',
      )
    contextService.extractTopRelevantCampaignFacts = vi
      .fn()
      .mockReturnValue(['purpose: Launch PDF lead magnet', 'tone: concise and persuasive'])
    const service = createExecuteService(contextService)

    const prompt = await service['buildSubtaskExecutionPrompt'](
      {} as any,
      { title: 'Sleep PDF', brief: 'Convert approved blog to PDF' },
      { content: { summary: 'Use approved copy as source' } },
      { title: 'Create final PDF', assigned_agent_key: 'designer', status: 'pending' },
      [
        {
          title: 'Approved blog copy',
          output: 'Use this exact body copy and keep wording unchanged.',
        },
      ],
      '',
      ['Please keep copy unchanged and add CTA on last page'],
    )

    expect(prompt.taskUserMessage).toContain('GUARANTEED_CONTEXT')
    expect(prompt.taskUserMessage).toContain('INTENT_DELTA')
    expect(prompt.taskUserMessage).toContain('targeted fetches')
    expect(prompt.taskUserMessage).toContain('Do NOT do broad exploratory fetch loops')
  })
})
