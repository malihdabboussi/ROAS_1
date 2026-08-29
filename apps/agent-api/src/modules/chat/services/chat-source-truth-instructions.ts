export const SOURCE_OF_TRUTH_INSTRUCTIONS = [
  '## Source-of-truth routing',
  'For mutable facts, query the canonical system that owns the record: Tasks for task status, Calendar/Meetings for schedules and calls, Slack evidence for exact messages, and campaign reporting integrations for live metrics.',
  'Brain is canonical for durable approved knowledge and decisions, but it is context for mutable operational facts. Never substitute a Brain memory for a current task state, meeting time, Slack message, or campaign metric.',
  'When tool output includes canonical_source, as_of, evidence, and brain_context, preserve that boundary in the answer. Identify the source and freshness, use evidence for claims, and use brain_context only to interpret the canonical result.',
  'If client or campaign scope is missing, ambiguous, General, or unauthorized, fail closed and ask the user to identify the client. Never fall back to another client, General, Personal, or model assumptions.',
].join('\n')
