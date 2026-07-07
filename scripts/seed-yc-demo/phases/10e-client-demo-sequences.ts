/**
 * P10e — Narrative demo sequences for Almanac, Saltline, Cloverkin, Throughput.
 */
import { CLIENT_DEMO_SEQUENCES } from '../content/client-demo-sequences'
import { resolveDemoOrgState } from '../lib/demo-org-state'
import { seedDemoSequence } from '../lib/seed-demo-sequence'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '10e-client-demo-sequences'

export async function seedClientDemoSequences(ctx: PhaseContext): Promise<{
  sequences: number
  emails: number
  workflows: number
  edges: number
  conversionPoints: number
}> {
  const resolved = await resolveDemoOrgState(ctx)

  let sequences = 0
  let emails = 0
  let workflows = 0
  let edges = 0
  let conversionPoints = 0

  for (const def of CLIENT_DEMO_SEQUENCES) {
    const result = await seedDemoSequence(ctx, PHASE_ID, def, resolved)
    sequences += 1
    emails += result.emails
    workflows += result.workflows
    edges += result.edges
    conversionPoints += result.conversionPoints
  }

  return { sequences, emails, workflows, edges, conversionPoints }
}

export const runP10eClientDemoSequences: PhaseHandler = async (ctx) => {
  const result = startResult(PHASE_ID)
  const counts = await seedClientDemoSequences(ctx)
  result.counts = counts
  result.ok = true
  return result
}
