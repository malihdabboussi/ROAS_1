import { Profiler, type ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CortexMaxBrainView } from './CortexMaxBrainView'
import type {
  BeliefPattern,
  BrainTimeline,
  CustomerAvatar,
  CustomerBrainView,
  NarrativePage,
  Perspective,
} from '../types'

vi.mock('@/components/ui/markdown-renderer', () => ({
  MarkdownRenderer: ({ children }: { children: string }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const page: NarrativePage = {
  id: 'page-1',
  slug: 'customer-patterns',
  title: 'Customer decision patterns',
  page_type: 'topic',
  summary: 'How customers decide.',
  content_md: 'Collective page body',
  source_refs: [],
  tags: ['decision'],
  status: 'active',
  version: 1,
  updated_at: '2026-06-24T10:00:00.000Z',
}

const timeline: BrainTimeline = {
  id: 'timeline-1',
  brain_id: 'brain-customer',
  timeline_type: 'journey',
  target_type: 'customer',
  target_id: null,
  title: 'Customer journey',
  summary: 'A collective customer journey.',
  status: 'active',
  evidence_started_at: '2026-06-01T00:00:00.000Z',
  evidence_ended_at: null,
  valid_from: null,
  valid_until: null,
  temporal_status: 'current',
  temporal_confidence: 0.8,
  temporal_source: null,
  metadata: {},
  created_by_agent_key: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-02T00:00:00.000Z',
  items: [],
}

const belief: BeliefPattern = {
  id: 'belief-1',
  pattern_name: 'Buyers need proof',
  description: 'They ask for receipts.',
  strength: 0.7,
  status: 'active',
  detected_at: '2026-06-03T00:00:00.000Z',
}

const perspective: Perspective = {
  id: 'perspective-1',
  name: 'Revenue owner lens',
  description: 'They think in risk.',
  strength: 0.65,
  status: 'active',
}

const customerView: CustomerBrainView = {
  success: true,
  brain_id: 'brain-customer',
  units: [
    {
      id: 'unit-1',
      brain_id: 'brain-customer',
      entity_key: 'acme.com',
      entity_type: 'account',
      display_name: 'Acme Inc',
      primary_contact_id: 'contact-1',
      status: 'active',
      confidence: 0.82,
      memory_count: 7,
      last_memory_at: '2026-06-20T00:00:00.000Z',
      first_seen_at: '2026-06-01T00:00:00.000Z',
      last_seen_at: '2026-06-21T00:00:00.000Z',
      metadata: {},
    },
  ],
  source_identities: [
    {
      id: 'identity-1',
      brain_id: 'brain-customer',
      customer_entity_id: 'unit-1',
      contact_id: 'contact-1',
      source_type: 'linkedin',
      source_id: 'linkedin-1',
      identity_kind: 'profile',
      source_label: 'Acme LinkedIn',
      confidence: 0.9,
      metadata: {},
      first_seen_at: '2026-06-01T00:00:00.000Z',
      last_seen_at: '2026-06-22T00:00:00.000Z',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-22T00:00:00.000Z',
    },
    {
      id: 'identity-orphan',
      brain_id: 'brain-customer',
      customer_entity_id: null,
      contact_id: null,
      source_type: 'webinar',
      source_id: 'webinar-1',
      identity_kind: 'source_identity',
      source_label: 'Orphan Webinar',
      confidence: 0.4,
      metadata: {},
      first_seen_at: '2026-06-10T00:00:00.000Z',
      last_seen_at: '2026-06-23T00:00:00.000Z',
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
    },
  ],
  unlinked_memories: [
    {
      memory_id: 'memory-unlinked-1',
      brain_id: 'brain-customer',
      content: 'Orphan webinar memory',
      memory_type: 'fact',
      contact_id: null,
      customer_entity_id: null,
      customer_source_identity_id: 'identity-orphan',
      customer_resolution_status: 'unlinked_source',
      customer_unit_key: 'webinar-1',
      customer_unit_type: 'webinar',
      customer_unit_name: 'Orphan Webinar',
      identity_kind: 'source_identity',
      source_type: 'webinar',
      source_id: 'webinar-1',
      source_title: 'Orphan webinar memory',
      created_at: '2026-06-23T00:00:00.000Z',
    },
  ],
  stats: {
    customer_units: 1,
    source_identities: 2,
    unlinked_memories: 1,
    linked_contact_memories: 3,
  },
}

const avatar: CustomerAvatar = {
  id: 'avatar-1',
  brain_id: 'brain-customer',
  name: 'Executive Buyer',
  summary: 'Budget owner with proof needs.',
  status: 'active',
  strength: 0.72,
  member_customer_unit_ids: ['unit-1'],
  member_contact_ids: ['contact-1'],
  member_strength: { 'unit-1': 0.74, 'contact-1': 0.5 },
}

function renderCustomerCortex() {
  let commitCount = 0
  const view = render(
    <Profiler id="cortex-max-brain-view" onRender={() => commitCount++}>
      <CortexMaxBrainView
        pages={[page]}
        timelines={[timeline]}
        beliefs={[belief]}
        perspectives={[perspective]}
        customerAvatars={[avatar]}
        customerView={customerView}
        layout="team2"
        scopeType="customer"
      />
    </Profiler>,
  )

  return { ...view, getCommitCount: () => commitCount }
}

describe('CortexMaxBrainView', () => {
  it('renders customer-scope cortex groups, details, search, and stable member resolution', async () => {
    const view = renderCustomerCortex()

    expect(screen.getByText('Collective')).toBeTruthy()
    expect(screen.getByText('Avatars')).toBeTruthy()
    expect(screen.getByText('Customers / Accounts')).toBeTruthy()
    expect(screen.getByText('Unlinked Signals')).toBeTruthy()
    expect(screen.queryByText('Timelines')).toBeNull()
    expect(screen.getByRole('button', { name: /Customer journey/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Acme Inc/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Orphan webinar memory/i })).toBeTruthy()

    const acmeButton = screen.getByText('Acme Inc').closest('button')
    expect(acmeButton).toBeTruthy()
    fireEvent.click(acmeButton as HTMLButtonElement)

    await waitFor(() => expect(screen.getByText('Customer / Account')).toBeTruthy())
    expect(screen.getByText('Source identities (1)')).toBeTruthy()
    expect(screen.getByText('Acme LinkedIn')).toBeTruthy()

    const avatarButton = screen.getByText('Executive Buyer').closest('button')
    expect(avatarButton).toBeTruthy()
    fireEvent.click(avatarButton as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: /Members \(1\)/i }))

    expect(screen.getAllByText('Acme Inc').length).toBeGreaterThan(0)
    expect(screen.getByText(/Account - 1 source identities - strength 74%/i)).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search cortex…'), {
      target: { value: 'orphan' },
    })

    expect(screen.getByRole('button', { name: /Orphan webinar memory/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Executive Buyer/i })).toBeNull()
    expect(view.getCommitCount()).toBeLessThan(18)
  })
})
