import { createRef } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { DeliverablePreviewBody } from './DeliverablePreviewBody'

const bodyMocks = vi.hoisted(() => ({
  entityRenderCount: 0,
  renderEntityPreview: vi.fn(
    ({ deliverableType, entityId }: { deliverableType: string; entityId: string }) => {
      bodyMocks.entityRenderCount += 1
      return (
        <div
          data-testid="entity-preview"
          data-deliverable-type={deliverableType}
          data-entity-id={entityId}
        />
      )
    },
  ),
}))

vi.mock('@/components/deliverables/DeliverableA4PagedPreview', () => ({
  DeliverableA4PagedPreview: () => <div data-testid="a4-preview" />,
}))

vi.mock('@/components/deliverables/DocxFileDeliverablePreview', () => ({
  DocxFileDeliverablePreview: () => <div data-testid="docx-preview" />,
}))

vi.mock('@/components/deliverables/SpaceDocDeliverablePreview', () => ({
  SpaceDocDeliverablePreview: ({
    googleActionTarget,
  }: {
    googleActionTarget?: HTMLElement | null
  }) => (
    <div
      data-testid="space-doc-preview"
      data-google-target={googleActionTarget?.dataset.testid ?? ''}
    />
  ),
}))

vi.mock('@/components/ui/markdown-renderer', () => ({
  MarkdownRenderer: ({ children }: { children: string }) => (
    <div data-testid="markdown-renderer">{children}</div>
  ),
}))

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <div data-testid="loading-orb" />,
}))

const entityDeliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'ad',
  title: 'Ad preview',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: 'ad-1',
  entity_table: 'ads',
  source: 'mission',
  created_at: '2026-06-28T11:10:00.000Z',
}

function renderEntityBody() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return (
      <DeliverablePreviewBody
        contentRef={createRef<HTMLDivElement>()}
        deliverable={entityDeliverable}
        entityContentLoading={false}
        isEntityType
        isTextContent={false}
        effectiveContent={null}
        viewMode="wide"
        renderEntityPreview={bodyMocks.renderEntityPreview}
      />
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('DeliverablePreviewBody', () => {
  beforeEach(() => {
    bodyMocks.entityRenderCount = 0
    bodyMocks.renderEntityPreview.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders non-doc entities through the existing entity preview without render churn', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderEntityBody()

    const preview = screen.getByTestId('entity-preview')
    expect(preview.dataset.deliverableType).toBe('ad')
    expect(preview.dataset.entityId).toBe('ad-1')
    expect(bodyMocks.renderEntityPreview).toHaveBeenCalledWith({
      deliverableType: 'ad',
      entityId: 'ad-1',
    })

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(5)
    expect(bodyMocks.entityRenderCount).toBeLessThan(5)

    consoleErrorSpy.mockRestore()
  })

  it('passes Mission header actions into the canonical Space document editor', () => {
    const actionTarget = document.createElement('div')
    actionTarget.dataset.testid = 'mission-google-action'
    render(
      <DeliverablePreviewBody
        contentRef={createRef<HTMLDivElement>()}
        deliverable={{
          ...entityDeliverable,
          type: 'doc',
          entity_id: 'doc-1',
          entity_table: 'space_items',
          metadata: { spaceId: 'space-1' },
        }}
        entityContentLoading={false}
        isEntityType
        isTextContent
        effectiveContent={null}
        viewMode="wide"
        fallbackSpaceId="space-1"
        spaceDocActionTarget={actionTarget}
        renderEntityPreview={bodyMocks.renderEntityPreview}
      />,
    )

    expect(screen.getByTestId('space-doc-preview').dataset.googleTarget).toBe(
      'mission-google-action',
    )
  })

  it('renders JSON-string conversation document markdown instead of the empty state', () => {
    const markdown =
      '# Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts\n\n## Hook\nFirst line of the ad script.'
    render(
      <DeliverablePreviewBody
        contentRef={createRef<HTMLDivElement>()}
        deliverable={{
          ...entityDeliverable,
          type: 'file',
          title: 'Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts',
          content: JSON.stringify(markdown),
          entity_id: '946a12f3-21e0-431f-87d9-eec0860e3a23',
          entity_table: 'conversation_documents',
        }}
        entityContentLoading={false}
        isEntityType={false}
        isTextContent={false}
        effectiveContent={null}
        viewMode="wide"
        renderEntityPreview={bodyMocks.renderEntityPreview}
      />,
    )

    expect(screen.getByTestId('markdown-renderer').textContent).toBe(markdown)
    expect(screen.queryByText('No content to display')).not.toBeInTheDocument()
  })
})
