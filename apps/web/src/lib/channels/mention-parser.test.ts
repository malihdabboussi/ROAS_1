import { describe, expect, it } from 'vitest'
import {
  applyMentionToText,
  buildMentionCandidates,
  getMentionQuery,
  parseEntityMentionsFromHtml,
  parseMentionsFromText,
} from './mention-parser'
import type { ChannelMember } from './channel-types'

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
