import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceDocDeliverablePreview } from './SpaceDocDeliverablePreview'

vi.mock('@/components/spaces/SpaceDocEditorPanelAdapter', () => ({
  SpaceDocEditorPanelAdapter: ({
    target,
    embedded,
    googleActionTarget,
  }: {
    target: { id: string; spaceId?: string; title: string }
    embedded?: boolean
    googleActionTarget?: HTMLElement | null
  }) => (
    <div
      data-testid="canonical-space-editor"
      data-item-id={target.id}
      data-space-id={target.spaceId}
      data-title={target.title}
      data-embedded={String(embedded)}
      data-google-target={googleActionTarget?.dataset.testid ?? ''}
    />
  ),
}))

describe('SpaceDocDeliverablePreview', () => {
  afterEach(cleanup)

  it('uses the canonical editable Space editor inside deliverable chrome', () => {
    const googleActionTarget = document.createElement('div')
    googleActionTarget.dataset.testid = 'google-action'

    render(
      <SpaceDocDeliverablePreview
        spaceId="space-1"
        itemId="item-1"
        title="Strategy map"
        googleActionTarget={googleActionTarget}
      />,
    )

    const editor = screen.getByTestId('canonical-space-editor')
    expect(editor.dataset.itemId).toBe('item-1')
    expect(editor.dataset.spaceId).toBe('space-1')
    expect(editor.dataset.title).toBe('Strategy map')
    expect(editor.dataset.embedded).toBe('true')
    expect(editor.dataset.googleTarget).toBe('google-action')
  })
})
