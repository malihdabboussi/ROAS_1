import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space } from '@/features/spaces/types'
import type { Form, FormSettings } from '@/lib/forms'
import { FormSettingsPanel } from './FormSettingsPanel'

const formSettingsMocks = vi.hoisted(() => ({
  fetchSpaces: vi.fn(),
  updateSpace: vi.fn(),
  patchActiveSpaceSchema: vi.fn(),
  toastSuccess: vi.fn(),
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
    aside: forwardRef<HTMLElement, MotionProps<HTMLElement>>(
      ({ children, initial, animate, exit, transition, ...props }, ref) => (
        <aside ref={ref} {...props}>
          {children}
        </aside>
      ),
    ),
  },
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  fetchSpaces: formSettingsMocks.fetchSpaces,
  updateSpace: formSettingsMocks.updateSpace,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      roster: Array<{
        participant_id: string
        kind: 'agent' | 'human'
        org_id: string | null
        user_id: string | null
        agent_key: string | null
        display_name: string
        avatar_url: string | null
        role_label: string | null
        specialties: string[]
        accepts_assignments: boolean
        delegation_notes: string | null
        timezone: string | null
        working_hours: Record<string, { start: string; end: string }> | null
        out_of_office_until: string | null
        current_load: number
        is_ready: boolean
        agent_level: string | null
        org_role: string | null
        email: string | null
        created_at: string
        updated_at: string | null
      }>
      currentUserId: string | null
      activeSpaceId: string | null
      patchActiveSpaceSchema: (schema: Record<string, unknown>) => void
    }) => unknown,
  ) =>
    selector({
      roster: [
        makeRosterEntry({
          participant_id: 'human-me',
          kind: 'human',
          user_id: 'user-1',
          display_name: 'Maya Owner',
          email: 'maya@example.com',
        }),
        makeRosterEntry({
          participant_id: 'agent-vibey',
          kind: 'agent',
          agent_key: 'vibey',
          display_name: 'Pixel Agent',
          role_label: 'Research',
        }),
      ],
      currentUserId: 'user-1',
      activeSpaceId: 'space-new',
      patchActiveSpaceSchema: formSettingsMocks.patchActiveSpaceSchema,
    }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: formSettingsMocks.toastSuccess,
  },
}))

function makeRosterEntry(
  overrides: Partial<{
    participant_id: string
    kind: 'agent' | 'human'
    org_id: string | null
    user_id: string | null
    agent_key: string | null
    display_name: string
    avatar_url: string | null
    role_label: string | null
    email: string | null
  }> = {},
) {
  return {
    participant_id: overrides.participant_id ?? 'member-1',
    kind: overrides.kind ?? 'human',
    org_id: overrides.org_id ?? 'org-1',
    user_id: overrides.user_id ?? null,
    agent_key: overrides.agent_key ?? null,
    display_name: overrides.display_name ?? 'Member',
    avatar_url: overrides.avatar_url ?? null,
    role_label: overrides.role_label ?? null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: overrides.email ?? null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: null,
  }
}

const spaces: Space[] = [
  {
    id: 'space-old',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Current space',
    description: null,
    campaign_id: 'campaign-1',
    is_template: false,
    visibility: 'private',
    schema: { version: 1, fields: [], views: [] },
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
  },
  {
    id: 'space-new',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Response space',
    description: null,
    campaign_id: 'campaign-1',
    is_template: false,
    visibility: 'private',
    schema: { version: 1, fields: [], views: [] },
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
  },
]

function makeForm(settings: FormSettings): Pick<Form, 'id' | 'name' | 'campaign_id' | 'settings' | 'schema'> {
  return {
    id: 'form-1',
    name: 'Lead form',
    campaign_id: 'campaign-1',
    settings,
    schema: {
      title: 'Lead form',
      description: 'Collect leads',
      questions: [
        {
          id: 'contact',
          type: 'contact',
          label: 'Contact details',
          contact_subfields: ['name', 'email', 'phone'],
        },
        {
          id: 'channel',
          type: 'single_select',
          label: 'Best channel',
          options: [
            { id: 'email', label: 'Email', color: 'blue' },
            { id: 'sms', label: 'SMS', color: 'green' },
          ],
        },
        {
          id: 'info',
          type: 'info_block',
          label: 'Intro copy',
        },
      ],
    },
  }
}

function renderPanel(initialSettings: FormSettings = {}) {
  const onClose = vi.fn()
  const onChange = vi.fn()

  function Harness() {
    const [settings, setSettings] = useState<FormSettings>({
      target_space_id: 'space-old',
      assignee_type: 'human',
      assignee_id: 'user-1',
      button_label: 'Send lead',
      layout: 'one_column',
      theme: 'dark',
      colors: {
        background: 'purple',
        surface: 'slate',
        styles: { background: 'glass' },
      },
      ...initialSettings,
    })

    const form = makeForm(settings)

    return (
      <FormSettingsPanel
        open
        onClose={onClose}
        form={form}
        settings={settings}
        onChange={(next) => {
          onChange(next)
          setSettings(next)
        }}
      />
    )
  }

  render(<Harness />)
  return { onClose, onChange }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('FormSettingsPanel', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    formSettingsMocks.fetchSpaces.mockResolvedValue(spaces)
    formSettingsMocks.updateSpace.mockResolvedValue(spaces[1])
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    consoleErrorSpy.mockRestore()
  })

  it('updates submission, layout, and color settings without render-loop errors', async () => {
    const { onChange } = renderPanel()

    expect(await screen.findByRole('dialog', { name: 'Form settings' })).toBeTruthy()

    fireEvent.click(screen.getByTitle('Me'))
    const meOptions = await screen.findAllByText('Me')
    fireEvent.click(meOptions[meOptions.length - 1]!)
    fireEvent.click(await screen.findByText('Pixel Agent'))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ assignee_type: 'agent', assignee_id: 'vibey' }),
    )

    const currentSpaceLabel = await screen.findByText('Current space')
    fireEvent.click(currentSpaceLabel.closest('button')!)
    const responseSpaceLabel = await screen.findByText('Response space')
    fireEvent.click(responseSpaceLabel.closest('button')!)
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          target_space_id: 'space-new',
          responses_view_id: 'form_responses_form-1',
        }),
      ),
    )
    expect(formSettingsMocks.updateSpace).toHaveBeenCalledWith(
      'space-new',
      expect.objectContaining({
        schema: expect.objectContaining({
          views: [expect.objectContaining({ id: 'form_responses_form-1' })],
        }),
      }),
    )
    expect(formSettingsMocks.patchActiveSpaceSchema).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Task title' }))
    fireEvent.click(screen.getByRole('button', { name: 'Contact details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Email' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ task_title_question_id: 'contact::email' }),
    )

    fireEvent.change(screen.getByDisplayValue('Send lead'), { target: { value: 'Apply now' } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ button_label: 'Apply now' }))

    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[2]!)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ show_recaptcha: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Two column' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ layout: 'two_column' }))

    fireEvent.click(screen.getByText('Light').closest('button')!)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'light' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Blue' })[0]!)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        colors: expect.objectContaining({ background: 'blue' }),
      }),
    )

    expectNoRenderLoop(consoleErrorSpy)
  })

  it('closes on escape and outside click while ignoring the settings trigger', async () => {
    const { onClose } = renderPanel()

    expect(await screen.findByRole('dialog', { name: 'Form settings' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const trigger = document.createElement('button')
    trigger.setAttribute('data-form-settings-trigger', '')
    document.body.appendChild(trigger)

    fireEvent.pointerDown(trigger)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(2)
    trigger.remove()
    expectNoRenderLoop(consoleErrorSpy)
  })
})
