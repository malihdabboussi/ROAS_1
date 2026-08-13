import { describe, expect, it } from 'vitest'
import {
  buildPageGraderSeedMemories,
  buildPageGraderSourceMemories,
  computePageGraderPackageContentHash,
  resolvePageGraderKnowledgeSourceType,
} from '../page-grader-brain-package-build'

const pkg = {
  envelope: {
    page_grader_client_id: 'client-1',
    unique_client_id: 'uc-1',
    exported_at: '2026-07-19T00:00:00.000Z',
    package_version: '1',
  },
  client: {
    id: 'client-1',
    name: 'Acme',
    ai_overview: 'Acme builds multifamily deals.',
  },
  client_offers: [{ name: 'Strategy Retainer', description: 'Monthly strategy' }],
  source_items: [
    {
      id: 'src-1',
      title: 'Kickoff call',
      content: 'Discussed ICP and offer packaging for investors.',
      category: 'strategy',
      status: 'confirmed',
      source_type: 'call',
    },
  ],
}

describe('page-grader-brain-package-build', () => {
  it('builds seed and source memories with stable content hashes', () => {
    const seeds = buildPageGraderSeedMemories(pkg, 'client-1')
    const sources = buildPageGraderSourceMemories(pkg, 'client-1')
    expect(seeds.some((m) => m.source_title === 'Client overview')).toBe(true)
    expect(seeds.some((m) => m.source_title === 'Offer: Strategy Retainer')).toBe(true)
    expect(sources).toHaveLength(1)
    expect(sources[0]?.content_hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('computes content hash independent of exported_at', () => {
    const a = computePageGraderPackageContentHash(pkg)
    const b = computePageGraderPackageContentHash({
      ...pkg,
      envelope: { ...pkg.envelope, exported_at: '2099-01-01T00:00:00.000Z' },
    })
    expect(a).toBe(b)
  })

  it('ingests recent Page Grader Slack messages as channel knowledge', () => {
    const withSlack = {
      ...pkg,
      slack_messages: [
        {
          slack_ts: '1786640400.123456',
          author: 'Bryce',
          date: '2026-08-13T11:00:00.000Z',
          text: 'The webinar ads are still not live.',
        },
      ],
    }
    const sources = buildPageGraderSourceMemories(withSlack, 'client-1')
    const slack = sources.find((memory) => memory.source_type === 'page_grader_slack')
    expect(slack).toMatchObject({
      source_id: '1786640400.123456',
      source_title: 'Slack — Bryce — 2026-08-13T11:00:00.000Z',
      metadata: expect.objectContaining({ needs_roas_extraction: true }),
    })
    expect(computePageGraderPackageContentHash(withSlack)).not.toBe(
      computePageGraderPackageContentHash(pkg),
    )
  })

  it('maps Page Grader memory provenance to Campaign Knowledge source types', () => {
    expect(
      resolvePageGraderKnowledgeSourceType({
        memorySourceType: 'page_grader_seed',
        sourceTitle: 'Avatar: Owner',
      }),
    ).toBe('avatar')
    expect(
      resolvePageGraderKnowledgeSourceType({
        memorySourceType: 'page_grader_seed',
        sourceTitle: 'Offer: Retainer',
      }),
    ).toBe('offer')
    expect(
      resolvePageGraderKnowledgeSourceType({
        memorySourceType: 'page_grader_slack',
        sourceTitle: 'Slack thread',
      }),
    ).toBe('channel_message')
    expect(
      resolvePageGraderKnowledgeSourceType({
        memorySourceType: 'page_grader_call',
        sourceTitle: 'Kickoff call',
      }),
    ).toBe('conversation_document')
    expect(
      resolvePageGraderKnowledgeSourceType({
        memorySourceType: 'page_grader_google_drive',
        sourceTitle: 'Brief',
      }),
    ).toBe('space_doc')
  })
})
