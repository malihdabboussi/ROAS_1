import { describe, expect, it, vi } from 'vitest'
import { normalizePlanSubtask } from '../../utils/normalize-intent'
import {
  MissionSubtaskTriageService,
  shouldReplanTriageReplacement,
} from '../phases/mission-subtask-triage.service'
import { MissionJsonService } from '../utils/mission-json.service'

describe('mission scope normalization', () => {
  it('preserves output contracts, schedules, and assertion keys from raw replacement subtasks', () => {
    const normalized = normalizePlanSubtask(
      {
        id: 'st-replacement',
        title: 'Visual Creative Replacement',
        assignTo: 'pixel',
        dependsOn: ['st-social'],
        assertionKeys: ['A-007', 'A-008'],
        scheduledAt: '2026-06-07T12:00:00.000Z',
        outputContract: {
          artifact_kind: 'document_artifact',
          required_action: 'generate_image',
          required_artifact_type: 'image',
        },
        intent: {
          why: 'Generate visual proof',
          story: 'The feed needs the claim visible before the caption',
          sensory: 'Five cohesive social graphics',
          endState: 'Images exist as durable campaign assets',
          ecology: 'No stock-photo aesthetic',
        },
      },
      'fallback',
      0,
    )

    expect(normalized).toMatchObject({
      id: 'st-replacement',
      assertionKeys: ['A-007', 'A-008'],
      scheduledAt: '2026-06-07T12:00:00.000Z',
      outputContract: {
        required_action: 'generate_image',
        required_artifact_type: 'image',
      },
    })
  })

  it('preserves append-subtask contract fields during review validation', () => {
    const service = new MissionJsonService()

    const result = service.validateAddSubtasks([
      {
        id: 'st-validation',
        title: 'Assertion Harness Validation Report',
        assignTo: 'niko',
        dependsOn: ['st-copy', 'st-visual'],
        assertionKeys: ['A-001'],
        scheduledAt: null,
        outputContract: {
          artifact_kind: 'document_artifact',
          required_action: 'save_document',
          required_artifact_type: 'doc',
        },
        intent: {
          why: 'Validate the mission harness',
          story: 'Independent QA checks every assertion',
          sensory: 'Pass/fail evidence table',
          endState: 'Validation report exists',
          ecology: 'No unsupported approvals',
        },
      },
    ])

    expect(result.valid).toBe(true)
    expect(result.subtasks[0]).toMatchObject({
      assertionKeys: ['A-001'],
      scheduledAt: null,
      outputContract: {
        required_action: 'save_document',
        required_artifact_type: 'doc',
      },
    })
  })

  it('retains validation dependencies when a blocked subtask is replaced', () => {
    const service = new MissionSubtaskTriageService(
      { getClient: vi.fn() } as any,
      { get: vi.fn() } as any,
      {} as any,
      {} as any,
    ) as any
    const rows = [
      { id: 'copy-1', title: 'Landing Page Copy', status: 'done', depends_on: [] },
      { id: 'visual-old', title: 'Visual Creative', status: 'blocked', depends_on: ['copy-1'] },
      {
        id: 'validate-old',
        title: 'Assertion Harness Validation Report',
        status: 'pending',
        assigned_agent_key: 'niko',
        depends_on: ['copy-1', 'visual-old'],
        intent: {
          why: 'Validate assertions',
          story: 'QA validates every artifact',
          sensory: 'Evidence table',
          endState: 'Validation report exists',
          ecology: 'No silent pass',
        },
      },
    ]

    const dependentIds = service.collectDependentSubtaskIds(rows, 'visual-old')
    const validationRows = service.collectDependentValidationSubtasks(
      rows,
      dependentIds,
      'visual-old',
    )
    const clone = service.cloneValidationSubtaskForReplacement(
      validationRows[0],
      ['visual-new'],
      dependentIds,
      0,
    )

    expect(validationRows).toHaveLength(1)
    expect(clone).toMatchObject({
      title: 'Assertion Harness Validation Report',
      assignTo: 'niko',
      dependsOn: ['copy-1', 'visual-new'],
    })
  })

  it('requires a replan when replacement would cancel ordinary downstream work', () => {
    const rows = [
      { id: 'precall', title: 'Pre-call strategy', status: 'blocked', depends_on: [] },
      { id: 'launch', title: 'Launch brief', status: 'pending', depends_on: ['precall'] },
      {
        id: 'validation',
        title: 'Assertion Harness Validation Report',
        status: 'pending',
        assigned_agent_key: 'niko',
        depends_on: ['launch'],
      },
    ]
    const dependentIds = new Set(['precall', 'launch', 'validation'])

    expect(shouldReplanTriageReplacement(rows, dependentIds, 'precall')).toBe(true)
    expect(
      shouldReplanTriageReplacement(
        [rows[0], { ...rows[2], depends_on: ['precall'] }],
        new Set(['precall', 'validation']),
        'precall',
      ),
    ).toBe(false)
  })
})
