import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ComposerInputStack } from './ComposerInputStack'

function Probe({ label }: { label: string }) {
  const [mountId] = useState(() => Math.random().toString(36).slice(2))
  return (
    <div data-testid="composer-child" data-mount-id={mountId}>
      {label}
    </div>
  )
}

describe('ComposerInputStack', () => {
  it('does not remount children when stackActive toggles', () => {
    const { rerender } = render(
      <ComposerInputStack stackActive topSlot={<div>Running</div>}>
        <Probe label="input" />
      </ComposerInputStack>,
    )

    const firstId = screen.getByTestId('composer-child').getAttribute('data-mount-id')
    expect(firstId).toBeTruthy()

    rerender(
      <ComposerInputStack stackActive={false} topSlot={<div>Running</div>}>
        <Probe label="input" />
      </ComposerInputStack>,
    )

    expect(screen.getByTestId('composer-child').getAttribute('data-mount-id')).toBe(firstId)

    rerender(
      <ComposerInputStack stackActive topSlot={<div>Running again</div>}>
        <Probe label="input" />
      </ComposerInputStack>,
    )

    expect(screen.getByTestId('composer-child').getAttribute('data-mount-id')).toBe(firstId)
  })
})
