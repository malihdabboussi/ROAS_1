import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CampaignsHubHeaderControls } from './CampaignsHubHeaderControls'

afterEach(cleanup)

describe('CampaignsHubHeaderControls', () => {
  it('keeps the campaign composer hidden until creation is requested', () => {
    const onStartCreate = vi.fn()

    const { rerender } = render(
      <CampaignsHubHeaderControls
        embedded={false}
        focusProgram={null}
        query=""
        newCampaignName=""
        showComposer={false}
        creatingCampaign={false}
        onQueryChange={vi.fn()}
        onStartCreate={onStartCreate}
        onNewCampaignNameChange={vi.fn()}
        onSubmitCreate={vi.fn()}
      />,
    )

    expect(screen.queryByPlaceholderText('Campaign name')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }))
    expect(onStartCreate).toHaveBeenCalledOnce()

    rerender(
      <CampaignsHubHeaderControls
        embedded={false}
        focusProgram={null}
        query=""
        newCampaignName=""
        showComposer
        creatingCampaign={false}
        onQueryChange={vi.fn()}
        onStartCreate={onStartCreate}
        onNewCampaignNameChange={vi.fn()}
        onSubmitCreate={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText('Campaign name')).toBeInTheDocument()
  })

  it('submits the campaign name from the composer', () => {
    const onSubmitCreate = vi.fn()
    const onNewCampaignNameChange = vi.fn()

    render(
      <CampaignsHubHeaderControls
        embedded={false}
        focusProgram={null}
        query=""
        newCampaignName="Launch"
        showComposer
        creatingCampaign={false}
        onQueryChange={vi.fn()}
        onStartCreate={vi.fn()}
        onNewCampaignNameChange={onNewCampaignNameChange}
        onSubmitCreate={onSubmitCreate}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Campaign name'), {
      target: { value: 'Launch two' },
    })
    expect(onNewCampaignNameChange).toHaveBeenCalledWith('Launch two')

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSubmitCreate).toHaveBeenCalledOnce()
  })
})
