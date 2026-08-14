import { describe, expect, it } from 'vitest'
import {
  buildMissionCanonicalArtifactContext,
  buildMissionQualityDeliverableContext,
  buildMissionQualityEvalPrompt,
} from './mission-quality-eval-context'

describe('buildMissionQualityDeliverableContext', () => {
  it('keeps the evaluator JSON contract in the focused prompt builder', () => {
    expect(buildMissionQualityEvalPrompt()).toContain('"qualityScore": 1-10')
  })

  it('includes canonical artifact contents alongside subtask receipts', () => {
    const context = buildMissionQualityDeliverableContext(
      [
        {
          title: 'Client strategy map',
          assigned_agent_key: 'nate',
          output: { summary: 'Strategy saved', artifact_manifest: [{ deliverable_id: 'doc-1' }] },
        },
      ],
      [
        {
          deliverableId: 'doc-1',
          title: 'Client Strategy Map',
          type: 'doc',
          content: '<h1>Client Strategy Map</h1><p>Production stays on hold until approved.</p>',
        },
      ],
    )

    expect(context).toContain('Strategy saved')
    expect(context).toContain('Canonical artifact content')
    expect(context).toContain('Production stays on hold until approved.')
  })

  it('builds a canonical artifact packet for manager review', () => {
    const context = buildMissionCanonicalArtifactContext([
      {
        deliverableId: 'doc-1',
        title: 'Client Strategy Map',
        type: 'doc',
        content: '<p>Verified route and source inventory.</p>',
      },
    ])

    expect(context).toContain('Canonical artifact content 1: Client Strategy Map')
    expect(context).toContain('Verified route and source inventory.')
  })
})
