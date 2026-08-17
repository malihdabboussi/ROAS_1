import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellHeaderAction } from './ShellHeaderAction'

const mocks = vi.hoisted(() => ({
  setPageHeaderAction: vi.fn(),
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: Object.assign(
    (selector: (state: { setPageHeaderAction: typeof mocks.setPageHeaderAction }) => unknown) =>
      selector({ setPageHeaderAction: mocks.setPageHeaderAction }),
    {
      getState: () => ({
        setPageHeaderAction: mocks.setPageHeaderAction,
        pageHeaderActionOwner: null,
      }),
    },
  ),
}))

describe('ShellHeaderAction', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('registers the action into the shell top bar', () => {
    render(
      <ShellHeaderAction>
        <button type="button">Portal</button>
      </ShellHeaderAction>,
    )

    expect(mocks.setPageHeaderAction).toHaveBeenCalledWith(expect.anything(), expect.any(Object))
    const action = mocks.setPageHeaderAction.mock.calls[0]?.[0] as React.ReactNode
    render(<>{action}</>)
    expect(screen.getByRole('button', { name: 'Portal' })).toBeInTheDocument()
  })
})
