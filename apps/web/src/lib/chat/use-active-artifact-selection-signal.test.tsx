import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  emitActiveArtifactSelection,
  useActiveArtifactSelectionSignal,
} from './use-active-artifact-selection-signal'

function ActiveArtifactProbe() {
  const artifact = useActiveArtifactSelectionSignal()
  return <span>{artifact?.id ?? 'none'}</span>
}

describe('useActiveArtifactSelectionSignal', () => {
  afterEach(() => {
    cleanup()
  })

  it('updates when an active artifact selection is emitted', () => {
    render(<ActiveArtifactProbe />)

    expect(screen.queryByText('none')).not.toBeNull()

    act(() => {
      emitActiveArtifactSelection({
        id: 'artifact-1',
        type: 'presentation',
        label: 'Pitch deck',
      })
    })

    expect(screen.queryByText('artifact-1')).not.toBeNull()
  })

  it('clears the active artifact selection', () => {
    render(<ActiveArtifactProbe />)

    act(() => {
      emitActiveArtifactSelection({
        id: 'artifact-1',
        type: 'presentation',
      })
      emitActiveArtifactSelection(null)
    })

    expect(screen.queryByText('none')).not.toBeNull()
  })
})
