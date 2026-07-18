import { normalizeBundleFiles } from '../utils/html-bundle.util'
import {
  formatPresentationContractIssues,
  validatePresentationFileBeforeSave,
  validatePresentationFilesBeforeSave,
} from '../utils/presentation-html-contract.util'
import type { ActionPreflightFailure } from './artifact-action-preflight'

export const PRESENTATION_ACTION_PREFLIGHT_OVERRIDES = {
  create_presentation: {
    mode: 'static_preflight',
    reason: 'Presentation bundle files must render before persistence.',
  },
  update_presentation: {
    mode: 'static_preflight',
    reason: 'Presentation bundle replacements must render before overwrite.',
  },
  write_presentation_file: {
    mode: 'static_preflight',
    reason: 'Presentation file writes must render before saving.',
  },
  update_presentation_tweaks: {
    mode: 'static_preflight',
    reason: 'Presentation tweak writes must render before saving.',
  },
} as const

export const PRESENTATION_ACTION_PREFLIGHTS = {
  create_presentation: validateCreatePresentationPreflight,
  update_presentation: validateUpdatePresentationPreflight,
  write_presentation_file: validateWritePresentationFilePreflight,
  update_presentation_tweaks: validateUpdatePresentationTweaksPreflight,
} as const

function presentationFailure(error: string): ActionPreflightFailure {
  return {
    error,
    errorCode: 'ARTIFACT_PRESENTATION_BUNDLE_INVALID',
    agentDiagnosis: 'The presentation bundle cannot render correctly enough to save.',
    agentInstruction:
      'Do not retry the same payload. Fix the named presentation source file issue and retry once with complete valid file content.',
    correction: {
      summary: 'Fix the presentation source file problem before saving.',
      next_tool_preference: [
        'describe_action',
        'create_presentation',
        'update_presentation',
        'write_presentation_file',
      ],
    },
    userExplanation: {
      intent: 'repair_presentation_source',
      sentence: 'I need to fix the presentation source before saving it.',
    },
    observability: { fingerprint: 'artifact.presentation_bundle_invalid' },
  }
}

function validatePresentationFilesPayload(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (!Object.prototype.hasOwnProperty.call(data, 'files')) return null

  let files
  try {
    files = normalizeBundleFiles(data.files, 'presentation')
  } catch (error) {
    return presentationFailure(error instanceof Error ? error.message : String(error))
  }

  const entryFile =
    typeof data.entry_file === 'string' && data.entry_file.trim()
      ? data.entry_file.trim()
      : 'index.html'
  const report = validatePresentationFilesBeforeSave(files, entryFile)
  if (report.blockingIssues.length === 0) return null
  return presentationFailure(formatPresentationContractIssues(report.blockingIssues))
}

function validatePresentationFilePayload(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const path = typeof data.path === 'string' ? data.path.trim() : ''
  const content = typeof data.content === 'string' ? data.content : ''
  if (!path || !content) return null

  const report = validatePresentationFileBeforeSave(path, content)
  if (report.blockingIssues.length === 0) return null
  return presentationFailure(formatPresentationContractIssues(report.blockingIssues))
}

export function validateCreatePresentationPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (!Object.prototype.hasOwnProperty.call(data, 'files')) {
    return presentationFailure(
      'files is required. Create a complete HTML presentation bundle with index.html.',
    )
  }
  return validatePresentationFilesPayload(data)
}

export function validateUpdatePresentationPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  return validatePresentationFilesPayload(data)
}

export function validateWritePresentationFilePreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  return validatePresentationFilePayload(data)
}

export function validateUpdatePresentationTweaksPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  return validatePresentationFilePayload(data)
}
