import { ArtifactPresentationsRepository } from '../repositories/artifact-presentations.repository'
import {
  verifyPresentationHtmlBundleContract,
  type PresentationContractIssue,
} from '../utils/presentation-html-contract.util'
import {
  buildDeliveryFailureResult,
  buildPresentationContractRepairResult,
} from './artifact-post-action-error-results'
import type {
  ArtifactPostActionVerificationCheck,
  ArtifactPostActionVerificationHost,
  ArtifactPostActionVerificationInput,
  ArtifactPostActionVerificationOutcome,
} from './artifact-post-action-verification.service'

const PRESENTATION_CONTRACT_ACTIONS = new Set([
  'create_presentation',
  'update_presentation',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'apply_presentation_element_edit',
  'add_presentation_anchor',
  'update_presentation_tweaks',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function walkRecords(value: unknown, visit: (key: string, nestedValue: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walkRecords(item, visit)
    return
  }
  if (!isRecord(value)) return
  for (const [key, nestedValue] of Object.entries(value)) {
    visit(key, nestedValue)
    walkRecords(nestedValue, visit)
  }
}

function collectPresentationId(input: ArtifactPostActionVerificationInput): string | null {
  let found: string | null = null
  const recordId = isRecord(input.result) ? nonEmptyString(input.result.id) : null
  if (
    recordId &&
    (input.action === 'create_presentation' || input.action === 'update_presentation')
  ) {
    return recordId
  }

  walkRecords(input.data, (key, value) => {
    if (!found && key === 'presentation_id') found = nonEmptyString(value)
  })
  walkRecords(input.result, (key, value) => {
    if (!found && key === 'presentation_id') found = nonEmptyString(value)
  })
  if (found) return found

  const result = isRecord(input.result) ? input.result : null
  const blocks = Array.isArray(result?.ui_blocks) ? result.ui_blocks : []
  for (const block of blocks) {
    if (!isRecord(block)) continue
    if (block.artifactType === 'presentation' || block.artifact_type === 'presentation') {
      return nonEmptyString(block.artifactId ?? block.artifact_id)
    }
  }
  return null
}

function getSourceMode(presentation: Record<string, unknown>): string | null {
  const metadata = isRecord(presentation.metadata) ? presentation.metadata : null
  return nonEmptyString(metadata?.source_mode)
}

function skippedCheck(detail: string): ArtifactPostActionVerificationCheck {
  return { type: 'presentation_contract', status: 'skipped', detail }
}

function failedOutcome(
  input: ArtifactPostActionVerificationInput,
  detail: string,
): ArtifactPostActionVerificationOutcome {
  return {
    status: 'failed',
    checks: [{ type: 'presentation_contract', status: 'failed', detail }],
    failureResult: buildDeliveryFailureResult(input, detail),
  }
}

export class ArtifactPresentationPostActionVerificationService {
  constructor(
    private readonly repository: ArtifactPresentationsRepository = new ArtifactPresentationsRepository(),
  ) {}

  async verify(
    input: ArtifactPostActionVerificationInput,
  ): Promise<ArtifactPostActionVerificationOutcome | null> {
    if (!PRESENTATION_CONTRACT_ACTIONS.has(input.action)) return null

    const presentationId = collectPresentationId(input)
    if (!presentationId) return null

    const userId = nonEmptyString(input.host.resolveUserId?.(input.sessionKey))
    const supabase = await this.getSupabaseClient(input.host, userId, input.sessionKey)
    if (!userId || !supabase) {
      return {
        status: 'not_required',
        checks: [skippedCheck('No user database client was available for presentation contract verification.')],
      }
    }

    const { data: presentation, error } = await this.repository.findPresentation(supabase as any, {
      presentationId,
      userId,
      columns: 'id, metadata, generated_html',
    })
    if (error) {
      return failedOutcome(
        input,
        `Could not read presentation ${presentationId} for contract verification: ${error.message}`,
      )
    }
    if (!presentation) {
      return failedOutcome(
        input,
        `Presentation ${presentationId} was not found for contract verification.`,
      )
    }

    const sourceMode = getSourceMode(presentation as Record<string, unknown>)
    if (sourceMode !== 'html_bundle') {
      if (input.action === 'create_presentation') {
        return this.repairRequired(input, presentationId, [
          {
            code: 'PRESENTATION_HTML_BUNDLE_REQUIRED',
            severity: 'repair_required',
            path: 'index.html',
            message: 'New presentations must be saved as source_mode="html_bundle".',
            fix: 'Replace the presentation with a complete index.html/styles.css bundle.',
          },
        ])
      }
      return {
        status: 'not_required',
        checks: [skippedCheck('Legacy generated_html presentation; html-bundle contract not applicable.')],
      }
    }

    const metadata = isRecord((presentation as Record<string, unknown>).metadata)
      ? ((presentation as Record<string, unknown>).metadata as Record<string, unknown>)
      : {}
    const entryFile = nonEmptyString(metadata.entry_file) ?? 'index.html'
    const [{ data: files, error: filesError }, { data: assets, error: assetsError }] =
      await Promise.all([
        this.repository.listPresentationFiles(supabase as any, presentationId),
        this.repository.listPresentationAssets(supabase as any, presentationId),
      ])
    if (filesError) return failedOutcome(input, `Could not read presentation files: ${filesError.message}`)
    if (assetsError) return failedOutcome(input, `Could not read presentation assets: ${assetsError.message}`)

    const report = verifyPresentationHtmlBundleContract({
      files: ((files ?? []) as Array<Record<string, unknown>>).map((file) => ({
        path: String(file.path ?? ''),
        content: String(file.content ?? ''),
        role: String(file.role ?? 'source'),
      })),
      knownPaths: ((assets ?? []) as Array<Record<string, unknown>>)
        .map((asset) => nonEmptyString(asset.path))
        .filter((path): path is string => !!path),
      entryFile,
    })

    if (report.repairIssues.length > 0) {
      return this.repairRequired(input, presentationId, report.repairIssues)
    }

    return {
      status: 'verified',
      checks: [
        {
          type: 'presentation_contract',
          status: 'passed',
          detail: 'Presentation html-bundle contract passed.',
        },
      ],
    }
  }

  private async getSupabaseClient(
    host: ArtifactPostActionVerificationHost,
    userId: string | null,
    sessionKey?: string,
  ): Promise<unknown | null> {
    if (!userId || typeof host.getUserClient !== 'function') return null
    return host.getUserClient(userId, sessionKey)
  }

  private repairRequired(
    input: ArtifactPostActionVerificationInput,
    presentationId: string,
    issues: PresentationContractIssue[],
  ): ArtifactPostActionVerificationOutcome {
    return {
      status: 'failed',
      checks: [
        {
          type: 'presentation_contract',
          status: 'failed',
          detail: `Presentation contract requires repair: ${issues.length} issue(s).`,
        },
      ],
      failureResult: buildPresentationContractRepairResult(input, presentationId, issues),
    }
  }
}
