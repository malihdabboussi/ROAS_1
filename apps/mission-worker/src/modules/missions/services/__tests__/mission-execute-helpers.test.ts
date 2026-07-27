import { describe, expect, it } from 'vitest'
import {
  getOutputContractConsistencyError,
  resolveMissionStatusWhileSubtaskRuns,
} from '../phases/mission-execute-helpers'

describe('resolveMissionStatusWhileSubtaskRuns', () => {
  it('preserves access-needed aggregate state for an independent running branch', () => {
    expect(resolveMissionStatusWhileSubtaskRuns('awaiting_access_approval')).toBe(
      'awaiting_access_approval',
    )
  })
  it('marks ordinary runnable missions in progress', () => {
    expect(resolveMissionStatusWhileSubtaskRuns('todo')).toBe('in_progress')
  })
})

describe('getOutputContractConsistencyError', () => {
  it('rejects the process_media plus document contract reproduced in production', () => {
    expect(
      getOutputContractConsistencyError({
        artifact_kind: 'document_artifact',
        required_action: 'process_media',
        required_artifact_type: 'doc',
      }),
    ).toBe('Action "process_media" requires artifact_kind "media_artifact".')
  })

  it('accepts process_media video contracts', () => {
    expect(
      getOutputContractConsistencyError({
        artifact_kind: 'media_artifact',
        required_action: 'process_media',
        required_artifact_type: 'video',
      }),
    ).toBeNull()
  })
})
