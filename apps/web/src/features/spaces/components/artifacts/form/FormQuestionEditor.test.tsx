import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FieldDef, Space } from '@/features/spaces/types'
import type { FormQuestion } from '@/lib/forms'
import { FormQuestionEditor } from './FormQuestionEditor'

const formEditorMocks = vi.hoisted(() => ({
  fetchSpaceById: vi.fn(),
  spaces: [
    {
      id: 'space-1',
      org_id: 'org-1',
      user_id: 'user-1',
      title: 'Pipeline',
      description: null,
      campaign_id: 'campaign-1',
      is_template: false,
      visibility: 'private',
      schema: {
        version: 1,
        fields: [
          {
            id: 'channel',
            name: 'Preferred channel',
            type: 'select',
            options: [
              { id: 'email', label: 'Email', color: 'blue' },
              { id: 'sms', label: 'SMS', color: 'green' },
            ],
          },
        ],
        views: [],
      },
      created_at: '2026-06-28T10:00:00.000Z',
      updated_at: '2026-06-28T10:00:00.000Z',
    },
  ] satisfies Space[],
}))

type MotionProps<TElement extends HTMLElement> = HTMLAttributes<TElement> & {
  children?: ReactNode
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: forwardRef<HTMLDivElement, MotionProps<HTMLDivElement>>(
      ({ children, initial, animate, exit, transition, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      ),
    ),
  },
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  fetchSpaceById: formEditorMocks.fetchSpaceById,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: { spaces: Space[] }) => unknown) =>
    selector({ spaces: formEditorMocks.spaces }),
}))

vi.mock('./FormFieldBindSubmenu', () => ({
  FormFieldBindSubmenu: ({
    onPickField,
    onOpenSettings,
  }: {
    onPickField: (field: FieldDef | null) => void
    onOpenSettings?: () => void
  }) => (
    <div data-testid="field-bind-submenu">
      <button
        type="button"
        onClick={() =>
          onPickField({
            id: 'channel',
            name: 'Preferred channel',
            type: 'select',
            options: [
              { id: 'email', label: 'Email', color: 'blue' },
              { id: 'sms', label: 'SMS', color: 'green' },
            ],
          })
        }
      >
        Pick preferred channel
      </button>
      <button type="button" onClick={onOpenSettings}>
        Open form settings
      </button>
    </div>
  ),
}))

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

function renderEditor(
  initialQuestion: FormQuestion,
  props: Partial<{
    targetSpaceId: string | null
    variant: 'default' | 'rail'
  }> = {},
) {
  const onChange = vi.fn()
  const onDelete = vi.fn()
  const onOpenSettings = vi.fn()

  function Harness() {
    const [question, setQuestion] = useState(initialQuestion)

    return (
      <FormQuestionEditor
        question={question}
        onChange={(next) => {
          onChange(next)
          setQuestion(next)
        }}
        onDelete={onDelete}
        targetSpaceId={props.targetSpaceId ?? 'space-1'}
        onOpenSettings={onOpenSettings}
        variant={props.variant}
      />
    )
  }

  render(<Harness />)

  return { onChange, onDelete, onOpenSettings }
}

describe('FormQuestionEditor', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let dateNowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    formEditorMocks.fetchSpaceById.mockResolvedValue(formEditorMocks.spaces[0])
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1782648000000)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    consoleErrorSpy.mockRestore()
    dateNowSpy.mockRestore()
  })

  it('enters edit mode, updates question chrome, binds a field, and deletes without render-loop errors', async () => {
    const { onChange, onDelete, onOpenSettings } = renderEditor({
      id: 'q-channel',
      type: 'single_select',
      label: 'Best channel',
      description: 'How should we reach you?',
      required: false,
      property_field_id: 'channel',
      options: [
        { id: 'phone', label: 'Phone', color: 'green' },
        { id: 'email', label: 'Email', color: 'blue' },
      ],
    })

    expect(screen.getByText('Best channel')).toBeTruthy()

    fireEvent.click(screen.getByText('Best channel'))
    expect(screen.getByDisplayValue('Best channel')).toBeTruthy()
    expect(screen.getByDisplayValue('How should we reach you?')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('Best channel'), {
      target: { value: 'Preferred channel' },
    })
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ label: 'Preferred channel' }),
      ),
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Required' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ required: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Hide field from form' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hidden: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Bound to Preferred channel' }))
    expect(await screen.findByTestId('field-bind-submenu')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open form settings' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Bound to Preferred channel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pick preferred channel' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        label: 'Preferred channel',
        property_field_id: 'channel',
        options: [
          { id: 'email', label: 'Email', color: 'blue' },
          { id: 'sms', label: 'SMS', color: 'green' },
        ],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove question' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('normalizes empty select options and edits option labels, colors, additions, and removals', async () => {
    const { onChange } = renderEditor({
      id: 'q-options',
      type: 'single_select',
      label: 'Choose one',
      options: [],
    })

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { id: 'opt_1', label: 'Option 1', color: 'purple' },
            { id: 'opt_2', label: 'Option 2', color: 'blue' },
          ],
        }),
      ),
    )

    fireEvent.click(screen.getByText('Choose one'))
    fireEvent.change(screen.getByDisplayValue('Option 1'), {
      target: { value: 'Website' },
    })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([expect.objectContaining({ label: 'Website' })]),
      }),
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Change color' })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Cyan' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([expect.objectContaining({ color: 'cyan' })]),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ id: 'opt_1782648000000', label: 'Option 3' }),
        ]),
      }),
    )

    const optionRows = screen.getAllByDisplayValue(/Option|Website/)
    const firstRow = optionRows[0]!.closest('div')
    expect(firstRow).toBeTruthy()
    fireEvent.click(within(firstRow as HTMLElement).getByRole('button', { name: 'Remove option' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: expect.not.arrayContaining([expect.objectContaining({ id: 'opt_1' })]),
      }),
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('edits contact subfields in rail mode without closing or render-loop errors', async () => {
    const { onChange } = renderEditor(
      {
        id: 'q-contact',
        type: 'contact',
        label: 'Contact details',
        contact_subfields: ['name', 'email'],
      },
      { variant: 'rail' },
    )

    expect(screen.getByDisplayValue('Contact details')).toBeTruthy()
    expect(screen.getByText('Full name')).toBeTruthy()
    expect(screen.getByText('Email')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contact_subfields: ['name', 'email', 'phone'] }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Full name' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contact_subfields: ['email', 'phone'] }),
    )
    expectNoRenderLoop(consoleErrorSpy)
  })
})
