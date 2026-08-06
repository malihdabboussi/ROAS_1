import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SpaceToolbarContext } from '../types'
import { ToolbarShell } from './ToolbarShell'

vi.mock('../../components/group-by-toolbar-popover', () => ({
  GroupByToolbarPopover: () => null,
}))

describe('ToolbarShell', () => {
  it('keeps every space toolbar on one horizontally scrollable row', () => {
    const ctx = {
      activeView: null,
      showGroupByInToolbar: false,
      docsDriveBrowseActive: false,
    } as unknown as SpaceToolbarContext

    const { container } = render(
      <ToolbarShell ctx={ctx}>
        <div>Left controls</div>
        <div>Right controls</div>
      </ToolbarShell>,
    )

    expect(container.firstElementChild).toHaveClass(
      'scrollbar-hide',
      'flex-nowrap',
      'overflow-x-auto',
    )
  })
})
