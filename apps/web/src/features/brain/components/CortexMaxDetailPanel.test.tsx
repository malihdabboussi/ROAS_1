import { type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CortexMaxDetailPanel } from './CortexMaxDetailPanel'
import type { CortexItem } from './cortex-max-view-model'

vi.mock('@/components/ui/markdown-renderer', () => ({
  MarkdownRenderer: ({ children }: { children: string }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('CortexMaxDetailPanel', () => {
  it('renders page and company object details with expandable metadata', () => {
    const pageItem: CortexItem = {
      kind: 'page',
      section: 'topic',
      id: 'page:page-1',
      title: 'Customer decision patterns',
      page: {
        id: 'page-1',
        slug: 'customer-patterns',
        title: 'Customer decision patterns',
        page_type: 'topic',
        summary: 'How customers decide.',
        content_md: 'Collective page body',
        source_refs: [{ type: 'memory', id: 'source-1' }],
        tags: ['decision'],
        status: 'active',
        version: 3,
        updated_at: '2026-06-24T10:00:00.000Z',
      },
    }

    const { rerender } = render(<CortexMaxDetailPanel item={pageItem} />)

    expect(screen.getByText('Topics')).toBeTruthy()
    expect(screen.getByText('Customer decision patterns')).toBeTruthy()
    expect(screen.getByText('decision')).toBeTruthy()
    expect(screen.getByText('Collective page body')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Metadata/i }))
    expect(screen.getByText('v3')).toBeTruthy()
    expect(screen.getByText('1 source')).toBeTruthy()

    const companyObjectItem: CortexItem = {
      kind: 'companyObject',
      section: 'identity',
      id: 'company-object:object-1',
      title: 'Customers need hard proof',
      companyObject: {
        id: 'object-1',
        org_id: 'org-1',
        brain_id: 'brain-1',
        object_type: 'belief',
        title: 'Customers need hard proof',
        truth: 'Proof beats promises.',
        status: 'active',
        confidence: 0.81,
        confidence_basis: {},
        source_signal_ids: ['signal-1', 'signal-2'],
        evidence_refs: [],
        retrieval_rule: {
          trigger: 'When comparing enterprise objections',
          context_form: 'Use sales proof points',
        },
        metadata: {},
        created_at: '2026-06-20T10:00:00.000Z',
        updated_at: '2026-06-24T10:00:00.000Z',
      },
    }

    rerender(<CortexMaxDetailPanel item={companyObjectItem} />)

    expect(screen.getByText('Customers need hard proof')).toBeTruthy()
    expect(screen.getByText('Proof beats promises.')).toBeTruthy()
    expect(screen.getByText(/When comparing enterprise objections/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Metadata/i }))
    expect(screen.getByText('2 sources')).toBeTruthy()
  })

  it('renders belief and perspective body details', () => {
    const beliefItem: CortexItem = {
      kind: 'belief',
      section: 'beliefs',
      id: 'belief:belief-1',
      title: 'Buyers need proof',
      belief: {
        id: 'belief-1',
        pattern_name: 'Buyers need proof',
        description: 'First: They ask for receipts. Second: They validate with peers.',
        strength: 0.72,
        status: 'active',
        supporting_memories: ['memory-1', 'memory-2'],
        emotional_signature: {
          dominant_emotion: 'trust',
          avg_valence: 0.5,
          avg_intensity: 0.7,
          speaker_intent: 'validate_budget',
        },
        detected_at: '2026-06-20T10:00:00.000Z',
      },
    }

    const { rerender } = render(<CortexMaxDetailPanel item={beliefItem} />)

    expect(screen.getByText('Buyers need proof')).toBeTruthy()
    expect(screen.getByText(/First: They ask for receipts/i)).toBeTruthy()
    expect(screen.getByText('trust')).toBeTruthy()
    expect(screen.getByText('+0.5')).toBeTruthy()
    expect(screen.getByText('70%')).toBeTruthy()
    expect(screen.getByText('validate budget')).toBeTruthy()

    const perspectiveItem: CortexItem = {
      kind: 'perspective',
      section: 'perspectives',
      id: 'perspective:perspective-1',
      title: 'Revenue owner lens',
      perspective: {
        id: 'perspective-1',
        name: 'Revenue owner lens',
        description: 'They think in risk.',
        influence_areas: ['budget_risk'],
        strength: 0.66,
        status: 'active',
        blind_spots: 'They underweight onboarding effort.',
        beliefs: ['belief-1'],
      },
    }

    rerender(<CortexMaxDetailPanel item={perspectiveItem} />)

    expect(screen.getByText('Revenue owner lens')).toBeTruthy()
    expect(screen.getByText('They think in risk.')).toBeTruthy()
    expect(screen.getByText('budget risk')).toBeTruthy()
    expect(screen.getByText('Blind Spots')).toBeTruthy()
    expect(screen.getByText('They underweight onboarding effort.')).toBeTruthy()
  })

  it('renders timeline milestones and avatar member resolution', () => {
    const timelineItem: CortexItem = {
      kind: 'timeline',
      section: 'timelines',
      id: 'timeline:timeline-1',
      title: 'Customer journey',
      timeline: {
        id: 'timeline-1',
        brain_id: 'brain-1',
        timeline_type: 'journey',
        target_type: 'customer',
        target_id: null,
        title: 'Customer journey',
        summary: 'A full customer journey.',
        status: 'active',
        evidence_started_at: '2026-06-01T00:00:00.000Z',
        evidence_ended_at: '2026-06-10T00:00:00.000Z',
        valid_from: null,
        valid_until: null,
        temporal_status: 'current',
        temporal_confidence: 0.8,
        temporal_source: null,
        metadata: {},
        created_by_agent_key: null,
        created_at: '2026-06-11T00:00:00.000Z',
        updated_at: '2026-06-12T00:00:00.000Z',
        items: [
          {
            id: 'timeline-item-1',
            timeline_id: 'timeline-1',
            brain_id: 'brain-1',
            episode_id: null,
            item_type: 'decision',
            title: 'Contract signed',
            description: 'The customer picked the proof-heavy proposal.',
            occurred_at: '2026-06-09T00:00:00.000Z',
            occurred_until: null,
            asserted_at: '2026-06-10T00:00:00.000Z',
            valid_from: null,
            valid_until: null,
            temporal_status: 'current',
            temporal_confidence: 0.9,
            temporal_source: null,
            importance: 1,
            confidence: 0.9,
            source_type: null,
            source_id: null,
            source_title: null,
            related_node_type: null,
            related_node_id: null,
            evidence_refs: [],
            dedupe_key: null,
            metadata: {},
            created_at: '2026-06-10T00:00:00.000Z',
            updated_at: '2026-06-11T00:00:00.000Z',
          },
        ],
      },
    }

    const { rerender } = render(<CortexMaxDetailPanel item={timelineItem} />)

    expect(screen.getByText('Customer journey')).toBeTruthy()
    expect(screen.getByText('A full customer journey.')).toBeTruthy()
    expect(screen.getByText('Contract signed')).toBeTruthy()
    expect(screen.getByText('The customer picked the proof-heavy proposal.')).toBeTruthy()

    const avatarItem: CortexItem = {
      kind: 'avatar',
      section: 'avatars',
      id: 'avatar:avatar-1',
      title: 'Executive Buyer',
      avatar: {
        id: 'avatar-1',
        brain_id: 'brain-1',
        name: 'Executive Buyer',
        summary: 'Budget owner with proof needs.',
        status: 'active',
        strength: 0.74,
        member_customer_unit_ids: ['unit-1'],
        member_contact_ids: ['contact-1'],
        member_strength: { 'unit-1': 0.74, 'contact-1': 0.5 },
        dominant_pain_points: ['unclear ROI'],
        blind_spots: 'Ignores adoption cost.',
      },
      customerView: {
        success: true,
        brain_id: 'brain-1',
        units: [
          {
            id: 'unit-1',
            brain_id: 'brain-1',
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
            brain_id: 'brain-1',
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
        ],
        unlinked_memories: [],
        stats: {
          customer_units: 1,
          source_identities: 1,
          unlinked_memories: 0,
          linked_contact_memories: 3,
        },
      },
    }

    rerender(<CortexMaxDetailPanel item={avatarItem} />)
    fireEvent.click(screen.getByRole('button', { name: /Members \(1\)/i }))

    expect(screen.getByText('Executive Buyer')).toBeTruthy()
    expect(screen.getByText('unclear ROI')).toBeTruthy()
    expect(screen.getByText('Ignores adoption cost.')).toBeTruthy()
    expect(screen.getByText('Acme Inc')).toBeTruthy()
    expect(screen.getByText(/Account - 1 source identities - strength 74%/i)).toBeTruthy()
  })
})
