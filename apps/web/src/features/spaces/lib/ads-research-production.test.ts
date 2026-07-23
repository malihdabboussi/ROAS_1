import { describe, expect, it } from 'vitest'
import type { MissionDeliverable, MissionSubtask } from '@/lib/missions'
import {
  buildAdsResearchApprovalSummary,
  extractAdsResearchConcepts,
  findAdsResearchApprovalGate,
} from './ads-research-production'

function deliverable(content: string): MissionDeliverable {
  return { content } as MissionDeliverable
}

describe('ads research production helpers', () => {
  it('extracts named recommendations while ignoring report headings', () => {
    expect(
      extractAdsResearchConcepts(
        deliverable(`
          <h2>Situation Summary</h2>
          <h2>Concept 1: Producer Without a Marketing Department</h2>
          <h2>The Core Problems</h2>
          <h3>Ad 2 - The Referral Ceiling</h3>
          <h2>Next Steps</h2>
        `),
      ),
    ).toEqual([
      {
        id: '1-producer-without-a-marketing-department',
        title: 'Producer Without a Marketing Department',
        route: 'design',
      },
      {
        id: '2-the-referral-ceiling',
        title: 'The Referral Ceiling',
        route: 'design',
      },
    ])
  })

  it('defaults video concepts to recording and creates a readable approval receipt', () => {
    const [concept] = extractAdsResearchConcepts(
      deliverable('## Concept 1: Founder Talking Head Video'),
    )
    expect(concept?.route).toBe('recording')
    expect(buildAdsResearchApprovalSummary([concept!])).toContain(
      '- Founder Talking Head Video (recording)',
    )
  })

  it('extracts the real Blaze recommendation-index table format', () => {
    expect(
      extractAdsResearchConcepts(
        deliverable(`
          <h2>Recommendation Index</h2>
          <table><tbody>
            <tr><th>#</th><th>Name</th><th>Priority</th></tr>
            <tr><td><p>R1</p></td><td><p>Practitioner Still In It</p></td><td>Run first</td></tr>
            <tr><td>R2</td><td>Breaking: Agents Quit Cold Calling</td><td>Run first</td></tr>
          </tbody></table>
          <h2>Validate Messaging Angles</h2>
        `),
      ),
    ).toEqual([
      {
        id: '1-practitioner-still-in-it',
        title: 'Practitioner Still In It',
        route: 'design',
      },
      {
        id: '2-breaking-agents-quit-cold-calling',
        title: 'Breaking: Agents Quit Cold Calling',
        route: 'design',
      },
    ])
  })

  it('finds the human research approval gate', () => {
    const gate = {
      id: 'gate',
      title: 'Gate 1 - Approve research recommendations',
    } as MissionSubtask
    expect(findAdsResearchApprovalGate([gate])?.id).toBe('gate')
  })
})
