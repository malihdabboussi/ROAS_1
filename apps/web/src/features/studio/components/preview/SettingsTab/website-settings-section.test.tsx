import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Funnel } from '@/features/studio/services/artifact-preview.service'
import { WebsiteSettingsSection } from './website-settings-section'

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({
    open,
    campaignId,
    onSelectAsset,
  }: {
    open: boolean
    campaignId: string
    onSelectAsset?: (asset: { public_url?: string | null }) => void
  }) => (
    <button
      type="button"
      data-campaign-id={campaignId}
      data-open={String(open)}
      data-testid="media-picker"
      onClick={() => onSelectAsset?.({ public_url: 'https://cdn.vibey.test/logo.png' })}
    >
      media picker
    </button>
  ),
}))

afterEach(cleanup)

function website(overrides: Partial<Funnel> = {}): Funnel {
  return {
    id: 'website-1',
    campaign_id: 'campaign-1',
    name: 'Website One',
    slug: 'website-one',
    funnel_type: 'website',
    status: 'draft',
    hide_branding: false,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    layout: {
      navigation: {
        logo: { url: 'https://cdn.vibey.test/old-logo.png', alt: 'Old logo' },
        items: [{ label: 'Home', path: '/', style: 'button' }],
      },
      footer: { copyright: 'Old copyright' },
      favicon_url: 'https://cdn.vibey.test/favicon.png',
    },
    ...overrides,
  }
}

describe('WebsiteSettingsSection', () => {
  it('renders website layout fields and saves the current layout payload', () => {
    const onSaveLayout = vi.fn().mockResolvedValue(undefined)

    render(
      <WebsiteSettingsSection
        websites={[website()]}
        activeIndex={0}
        setActiveIndex={vi.fn()}
        editingId={null}
        draftName=""
        setDraftName={vi.fn()}
        onStartEdit={vi.fn()}
        onCommitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveLayout={onSaveLayout}
        savingIds={new Set()}
        containerRef={createRef<HTMLDivElement>()}
        nameInputRef={createRef<HTMLInputElement>()}
        campaignId="campaign-1"
        themeId={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Website One' })).toBeTruthy()
    expect(screen.getByText('Logo & Favicon')).toBeTruthy()
    expect(screen.getByText('Navigation Items')).toBeTruthy()
    expect(screen.getByTestId('media-picker').dataset.campaignId).toBe('campaign-1')

    fireEvent.change(screen.getByPlaceholderText('My Brand'), {
      target: { value: 'New logo alt' },
    })
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }))
    const labelInputs = screen.getAllByPlaceholderText('Label')
    const pathInputs = screen.getAllByPlaceholderText('/path')
    fireEvent.change(labelInputs[labelInputs.length - 1]!, {
      target: { value: 'Pricing' },
    })
    fireEvent.change(pathInputs[pathInputs.length - 1]!, {
      target: { value: '/pricing' },
    })
    fireEvent.change(screen.getByPlaceholderText('© 2026 My Brand. All rights reserved.'), {
      target: { value: 'Copyright 2026' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Website Settings' }))

    expect(onSaveLayout).toHaveBeenCalledWith('website-1', {
      navigation: {
        logo: {
          url: 'https://cdn.vibey.test/old-logo.png',
          alt: 'New logo alt',
        },
        items: [
          { label: 'Home', path: '/', style: 'button' },
          { label: 'Pricing', path: '/pricing', style: 'link' },
        ],
      },
      footer: {
        socials: [],
        copyright: 'Copyright 2026',
      },
      favicon_url: 'https://cdn.vibey.test/favicon.png',
    })
  })
})
