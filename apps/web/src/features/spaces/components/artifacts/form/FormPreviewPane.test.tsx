import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Form } from '@/lib/forms'
import { FormPreviewPane } from './FormPreviewPane'

const formApiMocks = vi.hoisted(() => ({
  fetchForm: vi.fn(),
  updateForm: vi.fn(),
  publishForm: vi.fn(),
  unpublishForm: vi.fn(),
}))

const childRenderCounts = vi.hoisted(() => ({
  build: 0,
  preview: 0,
  reset() {
    this.build = 0
    this.preview = 0
  },
}))

vi.mock('@/lib/forms', () => ({
  fetchForm: formApiMocks.fetchForm,
  updateForm: formApiMocks.updateForm,
  publishForm: formApiMocks.publishForm,
  unpublishForm: formApiMocks.unpublishForm,
}))

vi.mock('@/components/ui/navigation/tabs', () => {
  let currentOnValueChange: ((value: string) => void) | null = null
  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (value: string) => void
      children: ReactNode
    }) => {
      currentOnValueChange = onValueChange
      return (
        <div data-current-tab={value} data-testid="tabs-root">
          {children}
        </div>
      )
    },
    TabsList: ({ children }: { children: ReactNode }) => <div role="tablist">{children}</div>,
    TabsTrigger: ({
      value,
      children,
    }: {
      value: string
      className?: string
      children: ReactNode
    }) => (
      <button type="button" role="tab" onClick={() => currentOnValueChange?.(value)}>
        {children}
      </button>
    ),
  }
})

vi.mock('./FormBuildTab', () => ({
  FormBuildTab: ({
    form,
    onChange,
    onOpenSettings,
    pagesRailCollapsed,
    onPagesRailCollapsedChange,
  }: {
    form: Form
    onChange: (patch: Partial<Form>) => void
    onOpenSettings: () => void
    pagesRailCollapsed: boolean
    onPagesRailCollapsedChange: (collapsed: boolean) => void
  }) => {
    childRenderCounts.build += 1
    return (
      <section data-testid="form-build-tab">
        <span>{form.name}</span>
        <button type="button" onClick={() => onChange({ name: 'Builder rename' })}>
          Save from build
        </button>
        <button type="button" onClick={onOpenSettings}>
          Open settings from build
        </button>
        <button type="button" onClick={() => onPagesRailCollapsedChange(!pagesRailCollapsed)}>
          Toggle pages rail
        </button>
      </section>
    )
  },
}))

vi.mock('./FormPreviewTab', () => ({
  FormPreviewTab: ({
    form,
    pagesRailCollapsed,
    onPagesRailCollapsedChange,
  }: {
    form: Form
    pagesRailCollapsed: boolean
    onPagesRailCollapsedChange: (collapsed: boolean) => void
  }) => {
    childRenderCounts.preview += 1
    return (
      <section data-testid="form-preview-tab">
        <span>{form.schema.title ?? form.name}</span>
        <button type="button" onClick={() => onPagesRailCollapsedChange(!pagesRailCollapsed)}>
          Toggle preview pages rail
        </button>
      </section>
    )
  },
}))

vi.mock('./FormSettingsPanel', () => ({
  FormSettingsPanel: ({
    open,
    onClose,
    settings,
    onChange,
  }: {
    open: boolean
    onClose: () => void
    settings: Form['settings']
    onChange: (settings: Form['settings']) => void
  }) =>
    open ? (
      <aside role="dialog" aria-label="Form settings">
        <button type="button" onClick={() => onChange({ ...settings, button_label: 'Send' })}>
          Save settings
        </button>
        <button type="button" onClick={onClose}>
          Close settings
        </button>
      </aside>
    ) : null,
}))

vi.mock('./FormResponsesPanel', () => ({
  FormResponsesPanel: ({
    open,
    onClose,
    formId,
  }: {
    open: boolean
    onClose: () => void
    formId: string
  }) =>
    open ? (
      <aside role="dialog" aria-label="Form responses">
        <span>{formId}</span>
        <button type="button" onClick={onClose}>
          Close responses
        </button>
      </aside>
    ) : null,
}))

vi.mock('./FormMenuDropdown', () => ({
  FormMenuDropdown: ({
    form,
    onClose,
    onChanged,
    onOpenSettings,
    onRequestRename,
    onOpenResponses,
    onOpenFullView,
  }: {
    form: { id: string; name: string }
    onClose: () => void
    onChanged: () => void
    onOpenSettings: () => void
    onRequestRename: () => void
    onOpenResponses: () => void
    onOpenFullView?: () => void
  }) => (
    <div role="menu" aria-label="Form options menu">
      <span>{form.name}</span>
      <button type="button" onClick={onOpenSettings}>
        Menu settings
      </button>
      <button type="button" onClick={onRequestRename}>
        Menu rename
      </button>
      <button type="button" onClick={onOpenResponses}>
        Menu responses
      </button>
      <button type="button" onClick={onChanged}>
        Menu changed
      </button>
      <button type="button" onClick={onOpenFullView}>
        Menu full view
      </button>
      <button type="button" onClick={onClose}>
        Close menu
      </button>
    </div>
  ),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

function makeForm(overrides: Partial<Form> = {}): Form {
  return {
    id: 'form-1',
    user_id: 'user-1',
    org_id: 'org-1',
    campaign_id: 'campaign-1',
    space_id: 'space-1',
    name: 'Lead form',
    slug: 'lead-form',
    share_token: 'share-token',
    status: 'draft',
    visibility: 'public',
    schema: {
      title: 'Lead capture',
      description: 'Collect qualified leads',
      questions: [
        {
          id: 'question-1',
          type: 'short_text',
          label: 'Name',
        },
      ],
    },
    settings: {
      target_space_id: 'space-2',
      button_label: 'Submit',
    },
    published_url: null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
    ...overrides,
  }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('FormPreviewPane', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    childRenderCounts.reset()
    formApiMocks.fetchForm.mockResolvedValue(makeForm())
    formApiMocks.updateForm.mockResolvedValue(makeForm())
    formApiMocks.publishForm.mockResolvedValue({ success: true, url: 'https://forms.test/form-1' })
    formApiMocks.unpublishForm.mockResolvedValue({ success: true, status: 'draft' })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    consoleErrorSpy.mockRestore()
  })

  it('loads the form, preserves editor wiring, and settles without render-loop errors', async () => {
    const onOpenFullView = vi.fn()

    render(
      <FormPreviewPane
        formId="form-1"
        toolbarLeading={<span>Leading slot</span>}
        fullscreenButton={<button type="button">Fullscreen</button>}
        trailingAfterDivider={<span>Trailing slot</span>}
        onOpenFullView={onOpenFullView}
      />,
    )

    expect(await screen.findByDisplayValue('Lead form')).toBeTruthy()
    expect(screen.getByText('Leading slot')).toBeTruthy()
    expect(screen.getByText('Trailing slot')).toBeTruthy()
    expect(screen.getByTestId('form-build-tab')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('Lead form'), {
      target: { value: 'Lead form renamed' },
    })
    await waitFor(() =>
      expect(formApiMocks.updateForm).toHaveBeenCalledWith(
        'form-1',
        expect.objectContaining({ name: 'Lead form renamed' }),
      ),
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByTestId('form-preview-tab')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Form settings'))
    expect(screen.getByRole('dialog', { name: 'Form settings' })).toBeTruthy()
    fireEvent.click(screen.getByText('Save settings'))
    await waitFor(() =>
      expect(formApiMocks.updateForm).toHaveBeenLastCalledWith(
        'form-1',
        expect.objectContaining({ settings: expect.objectContaining({ button_label: 'Send' }) }),
      ),
    )

    fireEvent.click(screen.getByLabelText('View responses'))
    expect(screen.getByRole('dialog', { name: 'Form responses' })).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Form options'))
    expect(screen.getByRole('menu', { name: 'Form options menu' })).toBeTruthy()
    fireEvent.click(screen.getByText('Menu full view'))
    expect(onOpenFullView).toHaveBeenCalledTimes(1)

    expect(childRenderCounts.build + childRenderCounts.preview).toBeLessThan(20)
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('preserves publish and unpublish behavior without render-loop errors', async () => {
    render(<FormPreviewPane formId="form-1" />)

    expect(await screen.findByDisplayValue('Lead form')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Publish/ }))
    const publishButtons = screen.getAllByRole('button', { name: 'Publish' })
    fireEvent.click(publishButtons[publishButtons.length - 1]!)

    await waitFor(() => expect(formApiMocks.publishForm).toHaveBeenCalledWith('form-1'))
    expect(screen.getByRole('button', { name: /Published/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Published/ }))
    expect(screen.getByDisplayValue('https://forms.test/form-1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))

    await waitFor(() => expect(formApiMocks.unpublishForm).toHaveBeenCalledWith('form-1'))
    expect(screen.getByRole('button', { name: /Publish/ })).toBeTruthy()
    expectNoRenderLoop(consoleErrorSpy)
  })
})
