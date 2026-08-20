import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const TASK_CLEANUP_PLAYBOOK_ID = 'task-cleanup'
export const TASK_CLEANUP_BOARD_TITLE = 'Task Cleanup Board'
export const TASK_CLEANUP_GATE_TITLE = 'Approve proposed tasks'

const WINDOW_LABELS: Record<string, string> = {
  this_week: 'this calendar week through today',
  last_7d: 'the last 7 days',
  today: 'today',
}

function readKickoff(input: Record<string, unknown> | null | undefined): {
  window: string
  windowLabel: string
  notes?: string
  client_context?: string
} {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  const windowKey =
    typeof raw.window === 'string' && WINDOW_LABELS[raw.window] ? raw.window : 'this_week'
  return {
    window: windowKey,
    windowLabel: WINDOW_LABELS[windowKey] ?? WINDOW_LABELS.this_week!,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    client_context: typeof raw.client_context === 'string' ? raw.client_context : undefined,
  }
}

export function expandTaskCleanupPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const atlas = pickAgent(['atlas'], input.workerAgentKeys, input.managerKey)
  const human = `human:${input.mission.user_id}`
  const hasHuman = Boolean(input.mission.user_id)
  const kickoffBits = [
    `Call window: ${kickoff.windowLabel} (${kickoff.window}).`,
    kickoff.client_context ? `Optional client filter: ${kickoff.client_context}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  const assertions: MissionPlaybookPlanResult['harness']['assertions'] = [
    {
      assertionKey: 'A-001',
      category: 'context',
      statement: 'Call transcripts and open tasks for the window were gathered from sources.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Named calls with source links plus an open-task list with ids.',
      failureSeverity: 'blocker',
    },
    {
      assertionKey: 'A-002',
      category: 'strategy',
      statement: 'A Task Cleanup Board lists outstanding promises and proposed tasks.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: `${TASK_CLEANUP_BOARD_TITLE} exists as a native editable document.`,
      failureSeverity: 'blocker',
    },
    {
      assertionKey: 'A-003',
      category: 'activation',
      statement: 'Approved proposed work exists as native platform tasks.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Each approved new item has a native task id; no extras were invented.',
      failureSeverity: 'blocker',
    },
  ]
  const gatherId = 'st-atlas-calls-tasks'
  const boardId = 'st-cleanup-board'
  const gateId = 'st-gate-cleanup'
  const fileId = 'st-file-tasks'
  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    {
      id: gatherId,
      title: 'Task 1 — Pull calls and open tasks',
      assignTo: atlas,
      dependsOn: [],
      assertionKeys: ['A-001'],
      scheduledAt: null,
      intent: intent({
        why: 'Outstanding work is hiding in this week of calls and already-open tasks.',
        story: 'Atlas inventories real calls and current native tasks before anyone files more.',
        sensory: 'Every call has a source link. Every open task has an id and owner.',
        endState: 'The window meetings and open tasks are listed without invented content.',
        ecology: `Cover ${kickoff.windowLabel}. Search Space and Brain for imported meeting evidence. Call get_integration for fathom (and fireflies if connected). For Fathom, use_integration list_meetings for the window, then get_transcript with recordingId. For Fireflies, list_transcripts then get_transcript. Do not limit to one client unless kickoff names a filter. Extract promises and agreements such as I will, you will, let us, we should, and any named owner plus deliverable. Call list_tasks on this Space (open statuses; include assigned_to_me). Never invent calls or tasks.\nKickoff:\n${kickoffBits}`,
      }),
    },
    {
      id: boardId,
      title: 'Task 2 — Task Cleanup Board',
      assignTo: atlas,
      dependsOn: [gatherId],
      assertionKeys: ['A-002'],
      scheduledAt: null,
      intent: intent({
        why: 'The operator needs one list of what is still open before anything is created.',
        story: 'Atlas diffs call promises against open tasks and proposes creates vs closes.',
        sensory: `"${TASK_CLEANUP_BOARD_TITLE}" has Proposed new, Already open, Close candidates, and Outstanding for you.`,
        endState: 'A native board exists. No native tasks were created yet.',
        ecology: `Save exactly "${TASK_CLEANUP_BOARD_TITLE}" as a native editable Space Doc. Sections required: Outstanding for you; Proposed new tasks (title, owner, source call, why it is not already a task); Already open (keep — match call promises to existing task ids); Close candidates (done on the call or clearly finished, with task id). Do not call create_task or complete tasks in this step.`,
      }),
      outputContract: docContract(TASK_CLEANUP_BOARD_TITLE),
    },
  ]

  let fileDependsOn = boardId
  if (hasHuman) {
    subtasks.push({
      id: gateId,
      title: TASK_CLEANUP_GATE_TITLE,
      assignTo: human,
      dependsOn: [boardId],
      assertionKeys: [],
      scheduledAt: null,
      intent: intent({
        why: 'Nothing should be filed until the operator confirms the list.',
        story: 'Review the board, then approve to create the proposed tasks.',
        sensory: 'Approve and continue files only the Proposed new tasks on the board.',
        endState: 'The operator confirmed which proposed tasks to create.',
        ecology:
          'Open Task Cleanup Board. Approve to create the Proposed new tasks as native platform tasks. Request changes if the list is wrong. Close candidates stay listed until you approve; they are not auto-closed here.',
      }),
    })
    fileDependsOn = gateId
  }

  subtasks.push({
    id: fileId,
    title: 'Task 3 — File approved tasks',
    assignTo: atlas,
    dependsOn: [fileDependsOn],
    assertionKeys: ['A-003'],
    scheduledAt: null,
    intent: intent({
      why: 'Approved promises should live as native tasks, not stay buried in a doc.',
      story: 'Atlas files only the approved Proposed new tasks inside the platform.',
      sensory: 'Each created task has a url/id and traces back to a board row.',
      endState: 'Approved new work exists as native Space tasks. No extras were invented.',
      ecology: `Read "${TASK_CLEANUP_BOARD_TITLE}". For each Proposed new task the operator approved, call native create_task in this Space (required: title). Put source call and promise in the description. If the owner is the operator, set assignee_type to human. Do not create Service Requests or ClickUp-only work. Do not create tasks that already exist in Already open. Only complete Close candidates that list a durable native task id and were approved. Return the created task ids.`,
    }),
  })

  return {
    kind: 'plan',
    title: 'Task Cleanup',
    summary:
      'Atlas audits this week of calls and open tasks, you approve the list, then native tasks are filed.',
    approach:
      'Gather real transcripts and open tasks, write one board, wait for Approve and continue, then create_task.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${TASK_CLEANUP_PLAYBOOK_ID}. ${kickoffBits}`,
        sources: [
          {
            sourceType: 'playbook',
            title: TASK_CLEANUP_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Approved deterministic task-cleanup flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'The playbook discovers calls and open tasks and records missing sources.',
        },
      },
      clarificationQuestions: [],
      assumptions: [],
      assertions,
      assertionCoverage: [
        {
          assertionKey: 'A-001',
          implementedBy: [gatherId],
          verifiedBy: ['human-review'],
          rationale: 'Playbook-owned coverage',
        },
        {
          assertionKey: 'A-002',
          implementedBy: [boardId],
          verifiedBy: ['human-review'],
          rationale: 'Playbook-owned coverage',
        },
        {
          assertionKey: 'A-003',
          implementedBy: [fileId],
          verifiedBy: ['human-review'],
          rationale: 'Playbook-owned coverage',
        },
      ],
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys: assertions.map((assertion) => assertion.assertionKey),
          evidenceRequired: 'Native cleanup board and created task ids.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Client strategy maps',
      'Webinar production',
      'Meta ads changes',
      'Auto-closing tasks the operator did not approve',
    ],
    assignTo: atlas,
  }
}
