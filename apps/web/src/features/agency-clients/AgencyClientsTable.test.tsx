import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgencyClient } from '@/lib/agency-clients'
import { AgencyClientsTable } from './AgencyClientsTable'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

function client(overrides: Partial<AgencyClient> = {}): AgencyClient {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Acme Co',
    display_name: 'Acme Co',
    status: 'active',
    pipeline_stage: 'active_happy',
    mapping: null,
    ...overrides,
  }
}

describe('AgencyClientsTable', () => {
  afterEach(cleanup)

  it('locks avatars to a square and keeps column widths shared across groups', () => {
    const { container } = render(
      <AgencyClientsTable
        groups={[
          [
            'active',
            [
              client({
                id: '11111111-1111-1111-1111-111111111111',
                logo_url: 'https://cdn.example/wide-logo.png',
              }),
            ],
          ],
          [
            'active_happy',
            [client({ id: '22222222-2222-2222-2222-222222222222', display_name: 'Other' })],
          ],
        ]}
      />,
    )

    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(2)
    for (const table of tables) {
      expect(table).toHaveClass('table-fixed')
      const cols = table.querySelectorAll('col')
      expect(cols[0]).toHaveClass('w-spacing-36')
      expect(cols[1]).toHaveClass('w-spacing-64')
      expect(cols[6]).toHaveClass('w-spacing-48')
    }

    const logo = container.querySelector('img')
    expect(logo).toHaveClass('h-spacing-9', 'w-spacing-9', 'object-cover')
    expect(logo?.parentElement).toHaveClass('h-spacing-9', 'w-spacing-9')
    expect(screen.getByText('O').parentElement).toHaveClass('h-spacing-9', 'w-spacing-9')
  })

  it('keeps pulse and slack to a single truncated line', () => {
    const slack =
      'Long slack wrap that previously blew the row height and column widths because the table used auto layout'
    render(
      <AgencyClientsTable
        groups={[
          [
            'active',
            [
              client({
                latest_slack_message: slack,
                latest_slack_message_at: '2026-08-03',
                weekly_update: {
                  current_work: 'Webinar CPL workstream',
                  current_progress: 'This secondary line must not render in the list',
                  status_color: 'green',
                  eow_what_we_did: '',
                  eow_carry_over: 'Carry leftover wrap-up detail',
                },
              }),
            ],
          ],
        ]}
      />,
    )

    const slackNode = screen.getByText(slack)
    expect(slackNode).toHaveClass('truncate')
    expect(slackNode).toHaveClass('body-3')
    expect(
      screen.queryByText('This secondary line must not render in the list'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Carry leftover wrap-up detail')).not.toBeInTheDocument()
    expect(screen.getByText('Add wrap-up')).toHaveClass('truncate', 'text-muted-foreground')
    expect(screen.getByText('Webinar CPL workstream')).toHaveClass('truncate')
  })
})
