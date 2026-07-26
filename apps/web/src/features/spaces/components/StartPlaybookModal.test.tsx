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

  it('starts static ad production from the global Missions playbook selector', () => {
    const onStart = vi.fn()
    render(<StartPlaybookModal open submitting={false} onClose={vi.fn()} onStart={onStart} />)

    fireEvent.click(screen.getByRole('button', { name: /Static Ad Production/i }))
    fireEvent.change(screen.getByLabelText('Exact copy'), {
      target: { value: 'MYTH: THREE WEEKS. SYSTEM: TEN MINUTES.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start playbook' }))

    expect(onStart).toHaveBeenCalledWith({
      playbookId: 'static-ad-production',
      fields: expect.objectContaining({
        selectedFormatIds: ['myth_vs_system'],
        quantity: 1,
        aspectRatio: '4:5',
        copyMode: 'use_my_copy',
        exactCopy: 'MYTH: THREE WEEKS. SYSTEM: TEN MINUTES.',
      }),
    })
  })

  it('starts exact two-scene IG video production from the global selector', () => {
    const onStart = vi.fn()
    render(<StartPlaybookModal open submitting={false} onClose={vi.fn()} onStart={onStart} />)

    fireEvent.click(screen.getByRole('button', { name: /IG Organic Video/i }))
    fireEvent.change(screen.getByLabelText('Headline'), {
      target: { value: 'YOUR NEXT CAMPAIGN / SHOULD NOT TAKE / THREE WEEKS' },
    })
    fireEvent.change(screen.getByLabelText('Red highlight phrase'), {
      target: { value: 'THREE WEEKS' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start playbook' }))

    expect(onStart).toHaveBeenCalledWith({
      playbookId: 'ig-organic-video-ad',
      fields: expect.objectContaining({
        selectedSceneIds: ['golden-hour-infinity-pool', 'hillside-pool-terrace'],
        copyMode: 'use_my_copy',
        sourceStrategy: 'reuse_when_available',
        headline: 'YOUR NEXT CAMPAIGN / SHOULD NOT TAKE / THREE WEEKS',
        highlightPhrase: 'THREE WEEKS',
      }),
    })
  })
})
