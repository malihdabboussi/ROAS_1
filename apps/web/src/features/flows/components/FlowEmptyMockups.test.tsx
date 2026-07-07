import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { FlowEmptyState, FlowHistoryRunsMockup, FlowManageFlowsMockup } from './FlowEmptyMockups'

describe('FlowEmptyState', () => {
  it('renders history copy without template browsing language', () => {
    render(
      <FlowEmptyState
        mockup={<FlowHistoryRunsMockup />}
        title={FLOWS_UI.historyTitle}
        description={FLOWS_UI.historyDescription}
      />,
    )

    expect(screen.getByText('Flow history')).toBeTruthy()
    expect(screen.getByText(/selected campaign and space scope/i)).toBeTruthy()
    expect(screen.queryByText(/browse flow templates/i)).toBeNull()
  })

  it('renders manage copy with the shared mockup shell', () => {
    render(
      <FlowEmptyState
        mockup={<FlowManageFlowsMockup />}
        title={FLOWS_UI.manageEmptyTitle}
        description={FLOWS_UI.manageEmptyDescription}
      />,
    )

    expect(screen.getByText('No flows yet')).toBeTruthy()
    expect(screen.getByText('Create one to run workflows in this space.')).toBeTruthy()
  })
})
