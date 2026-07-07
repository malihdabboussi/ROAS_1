import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormQuestion, FormResponse } from '@/lib/forms'
import { FormResponsesPanel } from './FormResponsesPanel'

const formResponseMocks = vi.hoisted(() => ({
  fetchFormResponses: vi.fn(),
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

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchFormResponses: formResponseMocks.fetchFormResponses,
}))

vi.mock('@/lib/forms', () => ({
  fetchFormResponses: formResponseMocks.fetchFormResponses,
}))

const questions: FormQuestion[] = [
  {
    id: 'contact',
    type: 'contact',
    label: 'Contact',
  },
  {
    id: 'channel',
    type: 'single_select',
    label: 'Best channel',
    options: [
      { id: 'email', label: 'Email' },
      { id: 'sms', label: 'SMS' },
    ],
  },
  {
    id: 'interests',
    type: 'multi_select',
    label: 'Interests',
    options: [
      { id: 'ops', label: 'Operations' },
      { id: 'growth', label: 'Growth' },
    ],
  },
  {
    id: 'notes',
    type: 'long_text',
    label: 'Notes',
  },
  {
    id: 'info',
    type: 'info_block',
    label: 'Intro copy',
  },
]

const responses: FormResponse[] = [
  {
    id: 'older-response',
    form_id: 'form-1',
    space_item_id: 'item-2',
    submitted_at: '2026-06-27T10:00:00.000Z',
    submitter_email: 'fallback@example.com',
    answers: {
      channel: 'sms',
    },
  },
  {
    id: 'newer-response',
    form_id: 'form-1',
    space_item_id: 'item-1',
    submitted_at: '2026-06-28T11:58:00.000Z',
    submitter_email: null,
    answers: {
      contact: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
      },
      channel: 'email',
      interests: ['ops', 'growth'],
      orphan_answer: 'Imported value',
    },
  },
]

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('FormResponsesPanel', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let dateNowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dateNowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-06-28T12:00:00.000Z').getTime())
    formResponseMocks.fetchFormResponses.mockResolvedValue(responses)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    dateNowSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('loads responses, opens response details, and handles escape without render-loop errors', async () => {
    const onClose = vi.fn()

    render(
      <FormResponsesPanel open onClose={onClose} formId="form-1" questions={questions} />,
    )

    expect(formResponseMocks.fetchFormResponses).toHaveBeenCalledWith('form-1')
    expect(await screen.findByRole('dialog', { name: 'Form responses' })).toBeTruthy()

    const list = await screen.findByRole('list')
    const rows = within(list).getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText('Ada Lovelace')).toBeTruthy()
    expect(within(rows[0]!).getByText('2m ago')).toBeTruthy()
    expect(within(rows[0]!).getByText(/Best channel: Email/)).toBeTruthy()
    expect(within(rows[0]!).getByText(/Interests: Operations, Growth/)).toBeTruthy()
    expect(within(rows[1]!).getByText('fallback@example.com')).toBeTruthy()
    expect(within(rows[1]!).getByText(/Best channel: SMS/)).toBeTruthy()

    fireEvent.click(rows[0]!)

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(screen.getByText('Submitted')).toBeTruthy()
    expect(screen.getByText('Best channel')).toBeTruthy()
    expect(screen.getByText('Email')).toBeTruthy()
    expect(screen.getByText('Operations')).toBeTruthy()
    expect(screen.getByText('Growth')).toBeTruthy()
    expect(screen.getByText('orphan_answer')).toBeTruthy()
    expect(screen.getByText('Imported value')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Responses' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('renders the empty state and closes when clicking outside the panel', async () => {
    const onClose = vi.fn()
    formResponseMocks.fetchFormResponses.mockResolvedValue([])

    render(
      <>
        <button type="button" data-form-responses-trigger>
          Open responses
        </button>
        <FormResponsesPanel open onClose={onClose} formId="form-1" questions={questions} />
      </>,
    )

    expect(await screen.findByText(/No responses yet/)).toBeTruthy()

    fireEvent.pointerDown(screen.getByText('Open responses'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expectNoRenderLoop(consoleErrorSpy)
  })
})
