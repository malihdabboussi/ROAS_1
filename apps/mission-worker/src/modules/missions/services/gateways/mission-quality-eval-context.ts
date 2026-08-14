import type { MissionQualityEvidence } from '../persistence/mission-quality-evidence.repository'

const MAX_ARTIFACT_CONTENT_CHARS = 40_000

export function buildMissionQualityEvalPrompt(): string {
  return [
    '[MISSION_CONTROL — QUALITY EVALUATION MODE]',
    'You are Vibey, acting as an independent quality evaluator.',
    'You are evaluating deliverables for a mission. You did NOT plan or manage this work.',
    'Judge purely on whether the output serves the mission brief well.',
    '',
    'Read skills/mission-quality-evaluator/SKILL.md',
    '',
    'STEP 1 — DYNAMIC RUBRIC:',
    'Read the mission brief below. Generate 3-5 evaluation criteria specific to this type of deliverable.',
    'For example, a financial report needs: data accuracy, time coverage, insight depth, presentation.',
    'A website needs: design coherence, copy quality, functional completeness, brand alignment.',
    '',
    'STEP 2 — SCORE EACH CRITERION:',
    'Score each criterion you generated on a 1-10 scale using the behavioral anchors in your evaluator skill.',
    'Every score MUST cite specific evidence from the deliverable. No score without a receipt.',
    '',
    'STEP 3 — VERIFY CLAIMS:',
    'Extract claims the deliverable makes about itself (e.g. "comprehensive 5-year analysis").',
    'Verify each claim against the actual content. Flag any unsubstantiated claims.',
    '',
    'STEP 4 — VERIFY MISSION HARNESS ASSERTIONS:',
    'If a mission harness contract is provided, evaluate every must assertion and cite concrete evidence or mark it failed.',
    '',
    'STEP 5 — STRENGTHS AND WEAKNESSES:',
    'List specific strengths and weaknesses with citations. Even excellent work has weaknesses.',
    '',
    'Respond with ONLY valid JSON (no markdown, no backticks):',
    '{',
    '  "dynamicRubric": [{"criterion": "...", "score": 1-10, "evidence": "..."}],',
    '  "dimensionScores": {',
    '    "intent_alignment": 1-10,',
    '    "craft": 1-10,',
    '    "originality": 1-10,',
    '    "brand_coherence": 1-10,',
    '    "completeness": 1-10',
    '  },',
    '  "qualityScore": 1-10,',
    '  "assertionResults": [{"assertionKey": "...", "passed": true/false, "evidence": "...", "blocking": true/false}],',
    '  "strengths": ["..."],',
    '  "weaknesses": ["..."],',
    '  "claimsVerification": [{"claim": "...", "verified": true/false, "evidence": "..."}],',
    '  "revisionGuidance": [{"dimension": "...", "score": N, "priority": "high/medium/low", "issue": "...", "revision_guidance": "...", "expected_impact": "..."}]',
    '}',
  ].join('\n')
}

function truncateArtifactContent(content: string): string {
  if (content.length <= MAX_ARTIFACT_CONTENT_CHARS) return content
  const tailLength = 8_000
  return `${content.slice(0, MAX_ARTIFACT_CONTENT_CHARS - tailLength)}\n\n[content truncated]\n\n${content.slice(-tailLength)}`
}

export function buildMissionQualityDeliverableContext(
  subtasks: Array<Record<string, any>>,
  evidence: MissionQualityEvidence[],
): string {
  const subtaskContext = subtasks
    .map((subtask, index) => {
      const output = subtask.output ? JSON.stringify(subtask.output, null, 2) : '(no output)'
      return `### Subtask receipt ${index + 1}: ${subtask.title}\nAssigned to: ${subtask.assigned_agent_key || 'unknown'}\nOutput receipt:\n${output}`
    })
    .join('\n\n')

  const artifactContext = evidence
    .map(
      (artifact, index) =>
        `### Canonical artifact content ${index + 1}: ${artifact.title}\nDeliverable id: ${artifact.deliverableId}\nType: ${artifact.type}\nContent:\n${truncateArtifactContent(artifact.content)}`,
    )
    .join('\n\n')

  return [subtaskContext, artifactContext || '### Canonical artifact content\n(none found)']
    .filter(Boolean)
    .join('\n\n')
}
