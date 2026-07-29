import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickMissionCampaignSpaceSelect } from './QuickMissionCampaignSpaceSelect'

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: vi.fn().mockResolvedValue([{ id: 'campaign-1', name: 'Impact Elite' }]),
}))

vi.mock('@/lib/flows/flow-space-picker.utils', () => ({
  groupFlowSpacesByCampaign: vi.fn(() => [
    {
      heading: 'Impact Elite',
      spaces: [{ id: 'space-1', title: 'The Lab Webinar' }],
    },
  ]),
}))

vi.mock('../automations/AutomationCategorizedSelect', () => ({
  AutomationCategorizedSelect: ({
    sections,
    searchPlaceholder,
  }: {
    sections: Array<{
      heading: string
      options: Array<{ label: string; description?: string }>
    }>
    searchPlaceholder: string
  }) => (
    <div>
      <span>{searchPlaceholder}</span>
      {sections.map((section) => (
        <div key={section.heading}>
          <span>{section.heading}</span>
          {section.options.map((option) => (
            <div key={option.label}>
              <span>{option.label}</span>
              <span>{option.description}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}))

describe('QuickMissionCampaignSpaceSelect', () => {
  it('groups searchable Space choices under their campaign', async () => {
    render(
      <QuickMissionCampaignSpaceSelect
        clients={[
          {
            campaignId: 'campaign-1',
            spaceId: 'space-1',
            title: 'The Lab Webinar',
          },
        ]}
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Search campaigns & spaces…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Impact Elite')).toHaveLength(2))
    expect(screen.getByText('The Lab Webinar')).toBeInTheDocument()
  })
})
