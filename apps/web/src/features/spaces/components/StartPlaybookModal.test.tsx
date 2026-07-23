import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StartPlaybookModal } from './StartPlaybookModal'

describe('StartPlaybookModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('starts the fixed pre-call-first playbook without restart choices', () => {
    const onStart = vi.fn()

    render(<StartPlaybookModal open submitting={false} onClose={vi.fn()} onStart={onStart} />)

    expect(screen.queryByText('Where to start')).toBeNull()
    expect(screen.queryByText('Post-call')).toBeNull()
    expect(screen.queryByText('Launch brief')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Start playbook' }))

    expect(onStart).toHaveBeenCalledWith({
      playbookId: 'webinar-fulfillment',
      fields: { client_context: '', transcript_url: '', drive_links: '', notes: '' },
    })
  })

  it('starts the Meta Ads Launch workflow', () => {
    const onStart = vi.fn()
    render(<StartPlaybookModal open submitting={false} onClose={vi.fn()} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /Meta Ads Launch/i }))
    fireEvent.change(screen.getByLabelText('Approved asset links'), {
      target: { value: 'https://drive.example/ads' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start playbook' }))
    expect(onStart).toHaveBeenCalledWith({
      playbookId: 'meta-ads-launch',
      fields: expect.objectContaining({ asset_links: 'https://drive.example/ads' }),
    })
  })

  it('starts the Meta Ads Audit workflow with objective-specific reporting scope', () => {
    const onStart = vi.fn()
    render(<StartPlaybookModal open submitting={false} onClose={vi.fn()} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /Meta Ads Audit/i }))
    fireEvent.change(screen.getByLabelText('Campaign names or IDs, one per line (optional)'), {
      target: { value: 'Registration Campaign' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start playbook' }))
    expect(onStart).toHaveBeenCalledWith({
      playbookId: 'meta-ads-audit',
      fields: expect.objectContaining({
        reporting_period: 'last_30d',
        comparison_period: 'previous_30d',
        selected_campaigns: 'Registration Campaign',
      }),
    })
  })
})
