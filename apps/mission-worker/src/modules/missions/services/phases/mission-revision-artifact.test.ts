import { describe, expect, it, vi } from 'vitest'
import { MissionExecutePhaseService } from './mission-execute-phase.service'
import { resolveCompletedSubtaskDeliverableId } from './mission-revision-artifact'

function createService() {
  const contextService = {
    buildCampaignContext: vi.fn().mockResolvedValue('Campaign context block'),
    extractTopRelevantCampaignFacts: vi.fn().mockReturnValue(['Fact A']),
  }
  const openclawGateway = { assertMissionHasCredits: vi.fn().mockResolvedValue(undefined) }
  const service = new MissionExecutePhaseService(
    {} as any,
    {} as any,
    {} as any,
    openclawGateway as any,
    contextService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  )
  return service as any
}

describe('mission revision artifact contract', () => {
  it('pins revision work to the existing canonical mission deliverable', async () => {
    const prompt = await createService()['buildSubtaskExecutionPrompt'](
      {} as any,
      { title: 'Client strategy', brief: 'Prepare the pre-call context map' },
      { content: { summary: 'Build the strategy package' } },
      {
        title: 'Context preparation',
        status: 'revision',
        feedback: 'Add the missing source log.',
        deliverable_id: 'mission-deliverable-1',
        intent: {},
      },
      [],
      '- action=save_document deliverable_id=mission-deliverable-1 title="Context map"',
      [],
    )

    expect(prompt.taskUserMessage).toContain('REVISION_ARTIFACT_CONTRACT')
    expect(prompt.taskUserMessage).toContain(
      'canonical_mission_deliverable_id: mission-deliverable-1',
    )
    expect(prompt.taskUserMessage).toContain('Do not substitute another Space document')
    expect(prompt.taskUserMessage).toContain('never return a space_item_id or document_id')
  })

  it('preserves the canonical deliverable when a revision returns an unrelated artifact', () => {
    expect(
      resolveCompletedSubtaskDeliverableId({
        canonicalOutputDeliverableId: null,
        existingDeliverableId: 'mission-deliverable-1',
        latestDeliverableId: 'mission-deliverable-2',
        isRevision: true,
      }),
    ).toBe('mission-deliverable-1')
  })
})
