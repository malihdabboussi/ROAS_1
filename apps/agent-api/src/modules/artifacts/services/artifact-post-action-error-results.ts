import {
  formatPresentationContractIssues,
  type PresentationContractIssue,
} from '../utils/presentation-html-contract.util'
import { buildErrorEnvelopeWithEscalation } from './artifact-error-classifier'

interface PostActionErrorInput {
  action: string
  sessionKey?: string
}

const BRAIN_WRITE_ACTIONS = new Set([
  'atlas_save_brain_context',
  'save_user_memory',
  'save_customer_memory',
  'ingest_user_brain_link',
  'ingest_user_brain_text',
  'ingest_user_brain_document',
  'ingest_customer_brain_link',
  'ingest_customer_brain_text',
  'ingest_agent_brain_link',
  'ingest_agent_brain_text',
  'ingest_meeting_transcript',
])

function isBrainWriteAction(action: string): boolean {
  return BRAIN_WRITE_ACTIONS.has(action)
}

export function buildDeliveryFailureResult(
  input: PostActionErrorInput,
  detail: string,
): Record<string, unknown> {
  const actionLabel = input.action.replace(/_/g, ' ')
  const isBrainWrite = isBrainWriteAction(input.action)
  return buildErrorEnvelopeWithEscalation(
    isBrainWrite
      ? `The ${actionLabel} action reported completion, but Vibey could not verify that the Brain write is readable. ${detail}`
      : `The ${actionLabel} action finished, but Vibey could not verify that the output is available through the expected technical path. ${detail}`,
    input.sessionKey,
    {
      errorCode: 'ARTIFACT_DELIVERY_FAILED',
      errorClass: 'platform_data_query_failed',
      reliability: 'high_confidence',
      effectState: isBrainWrite ? 'unknown_effect' : 'succeeded_delivery_failed',
      retryPolicy: {
        mode: 'do_not_retry_use_fallback',
        max_attempts: 0,
        stop_after_same_error: true,
        reason: isBrainWrite
          ? 'The Brain write is unverified; do not repeat it blindly or claim it was saved.'
          : 'The original action may have already completed; do not repeat it blindly.',
      },
      correction: {
        summary: isBrainWrite
          ? 'Verify with a Brain read, list, or search result before telling the user it was saved.'
          : 'Do not retry the original action. Use a verified alternate delivery path.',
        ...(isBrainWrite
          ? {
              next_tool_preference: [
                'list_user_brain_memories',
                'search_user_brain',
                'search_brain_context',
              ],
            }
          : {}),
      },
      fallback: {
        summary: isBrainWrite
          ? 'Search or list the target Brain by source title or content; if no row is found, tell the user the save was not verified.'
          : 'Use another delivery path, open the saved artifact by id, or tell the user what could not be verified.',
      },
      agentDiagnosis: isBrainWrite
        ? `The Brain write handler reported success, but post-action verification could not prove a readable Brain row: ${detail}`
        : `The handler returned success, but V1 post-action verification failed: ${detail}`,
      agentInstruction: isBrainWrite
        ? 'Do not tell the user this Brain save is done. Do not say it was created or saved unless a follow-up Brain read, list, or search returns the saved memory. If it is not found, tell the user the save could not be verified.'
        : 'Do not tell the user this is done. Do not repeat the original action blindly. Use a fallback delivery or lookup path.',
      userExplanation: {
        intent: isBrainWrite ? 'verify_brain_write' : 'use_alternate_delivery',
        sentence: isBrainWrite
          ? 'I could not verify that this reached Brain yet, so I will check before saying it is saved.'
          : 'I created it, but I could not verify the delivery path, so I will use another way to show it.',
      },
      forbiddenUserFraming: [
        'platform error',
        'platform rendering issue',
        'internal issue',
        ...(isBrainWrite ? ['saved to your brain', 'I created it'] : []),
      ],
      observability: {
        fingerprint: isBrainWrite
          ? 'artifact.brain_delivery_unverified'
          : 'artifact.delivery_failed',
        report_level: 'warn',
      },
    },
  ) as unknown as Record<string, unknown>
}

export function buildPresentationContractRepairResult(
  input: PostActionErrorInput,
  presentationId: string,
  issues: PresentationContractIssue[],
): Record<string, unknown> {
  const issueText = formatPresentationContractIssues(issues)
  return {
    ...(buildErrorEnvelopeWithEscalation(
      `The presentation was saved, but it needs source repairs before it is ready. ${issues.length} issue(s) found.`,
      input.sessionKey,
      {
        errorCode: 'ARTIFACT_PRESENTATION_CONTRACT_REPAIR_REQUIRED',
        errorClass: 'validation',
        reliability: 'high_confidence',
        effectState: 'partial_effect',
        retryPolicy: {
          mode: 'retry_with_corrected_payload',
          max_attempts: 2,
          stop_after_same_error: true,
          reason:
            'The saved deck source can be repaired with presentation file read/write/patch actions.',
        },
        correction: {
          summary:
            'Repair the saved presentation source, then verify again before saying it is done.',
          next_tool_preference: [
            'list_presentation_files',
            'read_presentation_file',
            'patch_presentation_file',
            'write_presentation_file',
          ],
        },
        fallback: null,
        agentDiagnosis: `Presentation contract verification found repairable source issues: ${issueText}`,
        agentInstruction: `Do not tell the user the presentation is done yet. presentation_id=${presentationId}. Fix these exact issues with presentation file actions, then let post-action verification pass: ${issueText}`,
        userExplanation: {
          intent: 'repair_presentation_source',
          sentence: 'I saved the deck draft and am tightening the source so it renders correctly.',
        },
        forbiddenUserFraming: ['platform error', 'rendering bug', 'internal issue'],
        observability: {
          fingerprint: 'artifact.presentation_contract_repair_required',
          report_level: 'warn',
        },
      },
    ) as unknown as Record<string, unknown>),
    presentation_id: presentationId,
    presentation_contract_issues: issues,
  }
}
