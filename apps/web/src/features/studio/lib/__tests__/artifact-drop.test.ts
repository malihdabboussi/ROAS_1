import { describe, expect, it } from 'vitest'
import type { MessageReference } from '../../types'
import { applyArtifactDrop } from '../artifact-drop'

describe('applyArtifactDrop', () => {
  it('adds a contact-conversation drop to BOTH the artifact chips and message references', () => {
    const result = applyArtifactDrop(
      { id: 'conv-1', type: 'contact-conversation', label: 'Telegram Chat' },
      { artifacts: [], references: [] },
    )

    expect(result.artifacts).toEqual([
      { id: 'conv-1', type: 'contact-conversation', label: 'Telegram Chat' },
    ])
    expect(result.references).toEqual([
      { kind: 'conversation', id: 'conv-1', label: 'Telegram Chat' },
    ])
  })

  it('adds other artifact types to the chip store only', () => {
    const result = applyArtifactDrop(
      { id: 'task-1', type: 'space-task', label: 'My task' },
      { artifacts: [], references: [] },
    )

    expect(result.artifacts).toHaveLength(1)
    expect(result.references).toHaveLength(0)
  })

  it('dedupes both stores on repeated drops', () => {
    const references: MessageReference[] = [
      { kind: 'conversation', id: 'conv-1', label: 'Telegram Chat' },
    ]
    const result = applyArtifactDrop(
      { id: 'conv-1', type: 'contact-conversation', label: 'Telegram Chat' },
      {
        artifacts: [{ id: 'conv-1', type: 'contact-conversation', label: 'Telegram Chat' }],
        references,
      },
    )

    expect(result.artifacts).toHaveLength(1)
    expect(result.references).toHaveLength(1)
  })
})
