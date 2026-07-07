import { Profiler, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateSpaceModal } from './CreateSpaceModal'

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground', glassClass: 'surface-card' }),
  IconPicker: ({
    customTrigger,
    disabled,
    onChange,
    onColorChange,
  }: {
    customTrigger?: ReactNode
    disabled?: boolean
    onChange: (iconName: string) => void
    onColorChange?: (colorId: string) => void
  }) => (
    <button
      type="button"
      aria-label="Change icon"
      disabled={disabled}
      onClick={() => {
        onChange('sparkles')
        onColorChange?.('purple')
      }}
    >
      {customTrigger ?? 'Icon picker'}
    </button>
  ),
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`space-icon-${name}`} />,
}))

describe('CreateSpaceModal', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('creates a team space with the selected permission and icon schema', async () => {
    const onCreate = vi.fn(async () => undefined)
    const onOpenChange = vi.fn()

    render(<CreateSpaceModal open onOpenChange={onOpenChange} onCreate={onCreate} />)

    fireEvent.change(screen.getByLabelText('Icon & name'), {
      target: { value: '  Launch Space  ' },
    })
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: '  Launch planning  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change icon' }))
    fireEvent.click(screen.getByRole('button', { name: /Admin/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'Launch Space',
        description: 'Launch planning',
        visibility: 'team',
        default_share_level: 'edit',
        schema: { icon: 'sparkles', icon_color: 'purple' },
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('validates the required name and creates private spaces without a share level', async () => {
    const onCreate = vi.fn(async () => undefined)

    render(<CreateSpaceModal open onOpenChange={vi.fn()} onCreate={onCreate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('alert').textContent).toBe('Space name is required')
    expect(onCreate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Icon & name'), {
      target: { value: 'Private Space' },
    })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'Private Space',
        description: undefined,
        visibility: 'private',
        default_share_level: undefined,
        schema: { icon: 'layout-grid' },
      })
    })
  })

  it('closes before browsing templates', () => {
    const onOpenChange = vi.fn()
    const onBrowseTemplates = vi.fn()

    render(
      <CreateSpaceModal
        open
        onOpenChange={onOpenChange}
        onCreate={vi.fn(async () => undefined)}
        onBrowseTemplates={onBrowseTemplates}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Or browse templates/ }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onBrowseTemplates).toHaveBeenCalledTimes(1)
  })

  it('shows create failures and settles without render-loop errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onCreate = vi.fn(async () => {
      throw new Error('Backend said no')
    })
    let commits = 0

    render(
      <Profiler id="create-space-modal" onRender={() => (commits += 1)}>
        <CreateSpaceModal open onOpenChange={vi.fn()} onCreate={onCreate} />
      </Profiler>,
    )

    fireEvent.change(screen.getByLabelText('Icon & name'), {
      target: { value: 'Ops Space' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Backend said no')
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(commits).toBeLessThan(20)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /maximum update depth|too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })
})
