import { describe, expect, it } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team'
import type { ChannelMember } from './channel-types'
import {
  applyMentionToText,
  buildMentionCandidates,
  dedupeChannelMentions,
  getMentionQuery,
  parseEntityMentionsFromHtml,
  parseMemberMentionsFromHtml,
  parseMentionsFromText,
} from './mention-parser'

const members: ChannelMember[] = [
  {
    id: 'member-user-1',
    channel_id: 'channel-1',
    member_type: 'user',
    user_id: 'user-1',
    agent_key: null,
    role: 'edit',
    added_by: null,
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    profile: { id: 'user-1', full_name: 'Ada Lovelace', avatar_url: 'profile.png' },
  },
  {
    id: 'member-agent-1',
    channel_id: 'channel-1',
    member_type: 'agent',
    user_id: null,
    agent_key: 'ada-lovelace',
    role: 'edit',
    added_by: null,
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'member-agent-2',
    channel_id: 'channel-1',
    member_type: 'agent',
    user_id: null,
    agent_key: 'developer',
    role: 'edit',
    added_by: null,
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    profile: { id: 'developer', full_name: 'Ari', avatar_url: 'ari.png' },
  },
]

describe('mention parser', () => {
  it('builds stable mention candidates and parses deduped text mentions', () => {
    const candidates = buildMentionCandidates(members, new Map([['ada-lovelace', 'agent.png']]))

    expect(candidates.map((candidate) => candidate.handle)).toEqual([
      'ada-lovelace',
      'ada-lovelace-2',
      'ari',
    ])
    expect(candidates[0]?.avatarUrl).toBe('profile.png')
    expect(candidates[1]?.avatarUrl).toBe('agent.png')
    expect(candidates[2]).toMatchObject({
      type: 'agent',
      handle: 'ari',
      label: 'Ari',
      agent_key: 'developer',
      avatarUrl: 'ari.png',
    })

    expect(parseMentionsFromText('Hi @ada-lovelace and @ada-lovelace', candidates)).toEqual([
      {
        type: 'user',
        user_id: 'user-1',
        agent_key: undefined,
        label: 'Ada Lovelace',
      },
    ])
  })

  it('resolves mention query ranges and text insertion', () => {
    expect(getMentionQuery('hello @ad', 9)).toEqual({ query: 'ad', start: 6, end: 9 })
    expect(
      applyMentionToText(
        'hello @ad',
        { start: 6, end: 9 },
        {
          key: 'member-user-1',
          type: 'user',
          handle: 'ada-lovelace',
          label: 'Ada Lovelace',
        },
      ),
    ).toEqual({ value: 'hello @ada-lovelace ', caretPosition: 20 })
  })

  it('resolves typed agents from the full roster before they join the channel', () => {
    const vibey = {
      participant_id: 'agent:vibey',
      kind: 'agent',
      org_id: 'org-1',
      user_id: null,
      agent_key: 'vibey',
      display_name: 'Vibey',
      avatar_url: null,
      role_label: 'CEO',
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
      email: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    } satisfies TeamRosterEntry
    const candidates = buildMentionCandidates(members, undefined, [vibey])

    expect(parseMentionsFromText('@vibey take a look', candidates)).toContainEqual({
      type: 'agent',
      user_id: undefined,
      agent_key: 'vibey',
      label: 'Vibey',
    })
  })

  it('parses selected member chips and dedupes them against rendered text', () => {
    const candidates = buildMentionCandidates(members)
    const fromHtml = parseMemberMentionsFromHtml(
      '<span data-type="mention" class="channel-mention" data-id="member-user-1" data-label="Ada Lovelace"></span>',
      candidates,
    )
    const fromText = parseMentionsFromText('@ada-lovelace', candidates)

    expect(dedupeChannelMentions([...fromText, ...fromHtml])).toEqual([fromText[0]])
  })

  it('parses deduped entity chips from html', () => {
    const html = [
      '<span class="entity-chip" data-entity-kind="doc" data-entity-id="doc-1" data-entity-label="Plan"></span>',
      '<span class="entity-chip" data-entity-kind="doc" data-entity-id="doc-1" data-entity-label="Plan"></span>',
      '<span class="entity-chip" data-entity-kind="mission" data-entity-id="mission-1" data-entity-label="Launch"></span>',
      '<span class="entity-chip" data-entity-kind="agent" data-entity-id="developer" data-entity-label="Ari"></span>',
    ].join('')

    expect(parseEntityMentionsFromHtml(html)).toEqual([
      { type: 'doc', entity_id: 'doc-1', agent_key: undefined, label: 'Plan' },
      { type: 'mission', entity_id: 'mission-1', agent_key: undefined, label: 'Launch' },
      { type: 'agent', entity_id: 'developer', agent_key: 'developer', label: 'Ari' },
    ])
  })
})
