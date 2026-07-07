import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useVoiceApproval, VoiceApprovalProvider } from './VoiceApprovalContext'

function VoiceApprovalProbe() {
  const voiceApproval = useVoiceApproval()
  return <div>{voiceApproval ? 'approval-ready' : 'approval-empty'}</div>
}

describe('VoiceApprovalContext', () => {
  it('provides the active voice approval callback to descendants', () => {
    render(
      <VoiceApprovalProvider value={vi.fn()}>
        <VoiceApprovalProbe />
      </VoiceApprovalProvider>,
    )

    expect(screen.getByText('approval-ready')).toBeTruthy()
  })

  it('returns null when no provider is active', () => {
    render(<VoiceApprovalProbe />)

    expect(screen.getByText('approval-empty')).toBeTruthy()
  })
})
