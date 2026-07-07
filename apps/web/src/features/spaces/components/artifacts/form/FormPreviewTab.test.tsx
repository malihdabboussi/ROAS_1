import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Form } from '@/lib/forms'
import { FormPreviewTab } from './FormPreviewTab'

const railState = vi.hoisted(() => ({
  renderCount: 0,
  reset() {
    this.renderCount = 0
  },
}))

vi.mock('./FormPagesRail', () => ({
  FormPagesRail: ({
    activePage,
    onSelectPage,
    collapsed,
    onCollapsedChange,
  }: {
    activePage: 'start' | 'end'
    onSelectPage: (page: 'start' | 'end') => void
    collapsed: boolean
    onCollapsedChange: (collapsed: boolean) => void
  }) => {
    railState.renderCount += 1
    return (
      <nav aria-label="Pages">
        <span>active:{activePage}</span>
        <button type="button" onClick={() => onSelectPage('start')}>
          Start Page
        </button>
        <button type="button" onClick={() => onSelectPage('end')}>
          End Page
        </button>
        <button type="button" onClick={() => onCollapsedChange(!collapsed)}>
          Toggle pages rail
        </button>
      </nav>
    )
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
    published_url: null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
    schema: {
      title: 'Lead capture',
      description: 'Collect qualified leads',
      questions: [
        {
          id: 'name',
          type: 'short_text',
          label: 'Name',
          placeholder: 'Full name',
          required: true,
        },
        {
          id: 'hidden-field',
          type: 'short_text',
          label: 'Hidden field',
          hidden: true,
        },
        {
          id: 'contact',
          type: 'contact',
          label: 'Contact details',
          contact_subfields: ['name', 'email'],
        },
        {
          id: 'choice',
          type: 'single_select',
          label: 'Best channel',
          options: [
            { id: 'email', label: 'Email' },
            { id: 'sms', label: 'SMS' },
          ],
        },
      ],
    },
    settings: {
      button_label: 'Send lead',
      layout: 'two_column',
      theme: 'dark',
      icon: 'sparkles',
      icon_color: 'purple',
      end_page_title: 'All set',
      end_page_message: 'Thanks for sharing your details.',
      end_page_icon: 'check-circle-2',
      colors: {
        background: '#ffffff',
        surface: '#111827',
        text: '#f8fafc',
        input: '#0f172a',
        button: '#6366f1',
        styles: {
          background: 'solid',
          surface: 'glass',
          input: 'solid',
          button: 'solid',
        },
      },
    },
    ...overrides,
  }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('FormPreviewTab', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    railState.reset()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('renders the current start preview and end page without render-loop errors', () => {
    const onPagesRailCollapsedChange = vi.fn()

    render(
      <FormPreviewTab
        form={makeForm()}
        pagesRailCollapsed={false}
        onPagesRailCollapsedChange={onPagesRailCollapsedChange}
      />,
    )

    expect(screen.getByDisplayValue('Lead capture')).toBeTruthy()
    expect(screen.getByDisplayValue('Collect qualified leads')).toBeTruthy()
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('*')).toBeTruthy()
    expect(screen.queryByText('Hidden field')).toBeNull()
    expect(screen.getAllByPlaceholderText('Full name')).toHaveLength(2)
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy()
    expect(screen.getByText('Email')).toBeTruthy()
    expect(screen.getByText('SMS')).toBeTruthy()

    const submitButton = screen.getByRole('button', { name: 'Send lead' })
    expect(submitButton.getAttribute('style')).toContain('background-color')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pages rail' }))
    expect(onPagesRailCollapsedChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: 'End Page' }))
    expect(screen.getByText('active:end')).toBeTruthy()
    expect(screen.getByText('All set')).toBeTruthy()
    expect(screen.getByText('Thanks for sharing your details.')).toBeTruthy()

    expect(railState.renderCount).toBeLessThan(10)
    expectNoRenderLoop(consoleErrorSpy)
  })
})
