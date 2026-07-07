import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAutomationTemplates } from '@/lib/flows/automation-template-api'
import { FlowsBrowseHub } from './FlowsBrowseHub'

vi.mock('@/lib/flows/automation-template-api', () => ({
  fetchAutomationTemplates: vi.fn(),
  installAutomationTemplate: vi.fn(),
}))

describe('FlowsBrowseHub', () => {
  afterEach(() => {
    cleanup()
  })

  it('loads template catalog without requiring a selected space', async () => {
    vi.mocked(fetchAutomationTemplates).mockResolvedValue([
      {
        id: 'daily-digest',
        title: 'Daily digest',
        description: 'Send a daily digest.',
        badge: 'Popular',
        workflows: ['sales_cs'],
      },
    ])

    render(
      <FlowsBrowseHub
        section="templates"
        onSectionChange={vi.fn()}
        spaceId={null}
        onInstalled={vi.fn()}
        onCreateBlank={vi.fn()}
        myLoopsPanel={<div>My loops panel</div>}
        myTemplatesPanel={<div>My templates panel</div>}
        historyPanel={<div>History panel</div>}
        webhooksPanel={<div>Webhooks panel</div>}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Daily digest')).toBeTruthy()
    })
    expect(fetchAutomationTemplates).toHaveBeenCalledWith(null)
  })

  it('renders the template empty state with mockup copy', async () => {
    vi.mocked(fetchAutomationTemplates).mockResolvedValue([])

    render(
      <FlowsBrowseHub
        section="templates"
        onSectionChange={vi.fn()}
        spaceId="space-1"
        onInstalled={vi.fn()}
        onCreateBlank={vi.fn()}
        myLoopsPanel={<div>My loops panel</div>}
        myTemplatesPanel={<div>My templates panel</div>}
        historyPanel={<div>History panel</div>}
        webhooksPanel={<div>Webhooks panel</div>}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('No templates in this category')).toBeTruthy()
    })
    expect(
      screen.getByText('Try another category or start a blank flow for this space.'),
    ).toBeTruthy()
  })

  it('renders My Loops panel when that section is selected', async () => {
    vi.mocked(fetchAutomationTemplates).mockResolvedValue([])

    render(
      <FlowsBrowseHub
        section="my-loops"
        onSectionChange={vi.fn()}
        spaceId="space-1"
        onInstalled={vi.fn()}
        onCreateBlank={vi.fn()}
        myLoopsPanel={<div>My loops panel</div>}
        myTemplatesPanel={<div>My templates panel</div>}
        historyPanel={<div>History panel</div>}
        webhooksPanel={<div>Webhooks panel</div>}
      />,
    )

    expect(screen.getByText('My loops panel')).toBeTruthy()
  })

  it('renders Webhooks panel when that section is selected', async () => {
    vi.mocked(fetchAutomationTemplates).mockResolvedValue([])

    render(
      <FlowsBrowseHub
        section="webhooks"
        onSectionChange={vi.fn()}
        spaceId="space-1"
        onInstalled={vi.fn()}
        onCreateBlank={vi.fn()}
        myLoopsPanel={<div>My loops panel</div>}
        myTemplatesPanel={<div>My templates panel</div>}
        historyPanel={<div>History panel</div>}
        webhooksPanel={<div>Webhooks panel</div>}
      />,
    )

    expect(screen.getByText('Webhooks panel')).toBeTruthy()
  })
})
