import type { ErrorReporter } from '@vibey/api-shared'
import type {
  ActiveArtifact,
  ActiveWorkingSet,
} from '../../shared/services/request-context.service'
import { normalizeArtifactActionData } from './artifact-action-data-normalizer'
import { buildActionOnHoldPreflightFailure } from './artifact-action-lifecycle-error'
import { isPromptModeActionOnHold } from './artifact-action-lifecycle'
import { validateActionPreflight } from './artifact-action-preflight'
import {
  ACTION_SCHEMAS,
  getResolvableFieldsForAction,
  validateActionData,
} from './artifact-action-schemas'
import {
  parseConversationIdFromSessionKey,
  resolveActionScope,
  validateScopeForAction,
  withBrainOpsActionDefaults,
  withFlowBuildDefaults,
  withScopeDefaults,
  type ArtifactActiveFlowBuild,
} from './artifact-action.registry'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactAuthorizationService } from './artifact-authorization.service'
import {
  buildErrorEnvelopeWithEscalation,
  recordSessionSuccess,
  type ArtifactErrorContractOptions,
} from './artifact-error-classifier'
import { formatArtifactThrownError } from './artifact-legacy-team-brain.service'
import {
  ArtifactPostActionVerificationService,
  type ArtifactPostActionVerifier,
} from './artifact-post-action-verification.service'
import { ArtifactResolverService } from './artifact-resolver.service'

const DEFAULT_SCOPE_V2_AGENTS = 'all'

function isScopeV2DefaultsEnabled(agentKey: string | null): boolean {
  const raw = (process.env.SCOPE_V2_DEFAULTS ?? DEFAULT_SCOPE_V2_AGENTS).trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  if (raw === '1' || raw === 'true' || raw === 'all') return true
  if (!agentKey) return false
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .includes(agentKey.toLowerCase())
}

function isArtifactResolverEnabled(): boolean {
  const raw = (process.env.ARTIFACT_RESOLVER_V1 ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'on'
}

function buildArtifactTargetClarificationBlock(
  action: string,
  candidates: ActiveArtifact[] = [],
): Record<string, unknown> {
  return {
    type: 'clarification',
    id: `artifact-target-${Date.now()}`,
    title: 'Which artifact should I update?',
    introMessage: 'I found more than one matching target.',
    questions: [
      {
        id: 'artifact_target',
        text: `Choose the target for ${action.replace(/_/g, ' ')}`,
        type: 'single_choice',
        required: true,
        options: candidates.map((candidate) => ({
          id: `${candidate.type}:${candidate.id}`,
          label: candidate.label ?? `${candidate.type} ${candidate.id}`,
          ...(candidate.parent ? { description: `Inside ${candidate.parent.type}` } : {}),
        })),
      },
    ],
    status: 'pending',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePreviewType(type: string): string {
  return type.replace(/-/g, '_')
}

function extractUiBlocks(result: unknown): Array<Record<string, unknown>> {
  if (!isRecord(result)) return []
  if (Array.isArray(result.ui_blocks)) {
    return result.ui_blocks.filter(isRecord)
  }
  return []
}

function isPresentActionValue(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

function buildPreResolutionValidationData(
  action: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const schema = ACTION_SCHEMAS[action]
  if (!schema?.resolvable?.length) return data

  const resolvableFields = new Set(schema.resolvable.map((field) => field.field))
  let next: Record<string, unknown> | null = null

  for (const requirement of schema.required) {
    const keys = Array.isArray(requirement) ? requirement : [requirement]
    if (keys.some((key) => isPresentActionValue(data[key]))) continue
    if (!keys.every((key) => resolvableFields.has(key))) continue

    next ??= { ...data }
    for (const key of keys) {
      if (!isPresentActionValue(next[key])) next[key] = '__pending_artifact_resolver__'
    }
  }

  return next ?? data
}

function validateActionDataBeforeExpensiveWork(
  action: string,
  data: Record<string, unknown>,
): string | null {
  return validateActionData(action, buildPreResolutionValidationData(action, data))
}

function buildPreflightError(
  error: string,
  sessionKey: string | undefined,
  options: ArtifactErrorContractOptions,
) {
  return buildErrorEnvelopeWithEscalation(error, sessionKey, {
    errorClass: 'validation',
    reliability: 'high_confidence',
    effectState: 'failed_before_effect',
    ...options,
  })
}

function hasAgentToolErrorContract(result: Record<string, unknown>): boolean {
  return (
    typeof result.error_code === 'string' &&
    typeof result.error_class === 'string' &&
    typeof result.agent_instruction === 'string' &&
    result.retry_policy !== null &&
    typeof result.retry_policy === 'object' &&
    result.user_explanation !== null &&
    typeof result.user_explanation === 'object' &&
    Array.isArray(result.forbidden_user_framing)
  )
}

function extractFailedResultMessage(result: Record<string, unknown>): string {
  if (typeof result.error === 'string' && result.error.trim()) return result.error
  if (typeof result.message === 'string' && result.message.trim()) return result.message
  return 'Operation failed'
}

function normalizeFailedActionResult(
  result: Record<string, unknown>,
  sessionKey: string | undefined,
): Record<string, unknown> {
  if (hasAgentToolErrorContract(result)) return result
  const message = extractFailedResultMessage(result)
  const envelope = buildErrorEnvelopeWithEscalation(message, sessionKey)
  return { ...result, ...envelope }
}

function preserveDurableOutputReceipts(
  failureResult: Record<string, unknown> | undefined,
  successfulResult: unknown,
): Record<string, unknown> | undefined {
  if (!failureResult) return failureResult
  const uiBlocks = extractUiBlocks(successfulResult)
  return uiBlocks.length > 0 ? { ...failureResult, ui_blocks: uiBlocks } : failureResult
}

type ArtifactActionHost = Record<string, any> & {
  errorReporter?: ErrorReporter
  resolveUserId?: (sessionKey?: string) => string | null | undefined
  getUserClient?: (userId: string, sessionKey?: string) => Promise<unknown>
  requestContext?: {
    getActiveFlowBuild?: (conversationId: string) => ArtifactActiveFlowBuild | null
    getActiveWorkingSet?: (conversationId: string) => ActiveWorkingSet
    setActiveArtifact?: (conversationId: string, artifact: ActiveArtifact) => void
  }
}

export class ArtifactActionExecutionService {
  constructor(
    private postActionVerifier: ArtifactPostActionVerifier = new ArtifactPostActionVerificationService(),
  ) {}

  setPostActionVerifierForTests(verifier: ArtifactPostActionVerifier): void {
    this.postActionVerifier = verifier
  }

  async executeAction(
    host: ArtifactActionHost,
    actionRegistry: Record<string, ArtifactActionHandler>,
    authzService: ArtifactAuthorizationService,
    artifactResolverService: ArtifactResolverService,
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<unknown> {
    try {
      const normalized = normalizeArtifactActionData(action, data ?? {})
      if (normalized.conflicts.length > 0) {
        const conflictText = normalized.conflicts
          .map((conflict) => `${conflict.from}->${conflict.to}`)
          .join(', ')
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'schema_validation',
          message: `Schema preflight: conflicting action data aliases (${conflictText})`,
          category: 'tool',
          context: {
            action,
            normalizedKeys: normalized.normalizedKeys,
            conflicts: normalized.conflicts,
            providedKeys: Object.keys(data ?? {}),
            sessionKey: sessionKey?.slice(0, 40),
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildPreflightError(`Conflicting action data aliases: ${conflictText}`, sessionKey, {
          errorCode: 'ARTIFACT_SCHEMA_CONFLICT',
          agentDiagnosis:
            'The payload contains multiple aliases for the same canonical field with different values.',
          agentInstruction:
            'Do not retry this payload. Remove one side of each conflicting alias pair, keep the canonical field, and retry once.',
          correction: {
            summary: 'Remove conflicting alias keys and keep one canonical value before retrying.',
            next_tool_preference: ['describe_action'],
          },
          userExplanation: {
            intent: 'correct_conflicting_inputs',
            sentence: 'I found conflicting inputs, so I will clean them up and try again.',
          },
          observability: { fingerprint: 'artifact.schema_conflict' },
        })
      }

      const agentKey = (host.parseAgentIdFromSessionKey?.(sessionKey) as string | null) ?? null
      const conversationId = parseConversationIdFromSessionKey(sessionKey)
      const scope = isScopeV2DefaultsEnabled(agentKey) ? resolveActionScope(host, sessionKey) : null
      const scopedActionData = withScopeDefaults(action, normalized.data, scope)
      const activeFlowBuild =
        conversationId && typeof host.requestContext?.getActiveFlowBuild === 'function'
          ? host.requestContext.getActiveFlowBuild(conversationId)
          : null
      const actionData = withBrainOpsActionDefaults(
        action,
        withFlowBuildDefaults(action, scopedActionData, activeFlowBuild),
        sessionKey,
      )
      if (isPromptModeActionOnHold(action)) {
        return buildActionOnHoldPreflightFailure({
          host,
          action,
          actionData,
          normalizedKeys: normalized.normalizedKeys,
          sessionKey,
        })
      }
      const handler = actionRegistry[action]
      if (!handler) {
        return buildPreflightError(`Unknown action: ${action}`, sessionKey, {
          errorCode: 'ARTIFACT_UNKNOWN_ACTION',
          agentDiagnosis: 'The requested action name is not registered in the artifact action map.',
          agentInstruction:
            'Do not retry this action name. Choose a valid registered tool action for the user request.',
          correction: {
            summary: 'Replace the unknown action name with a registered artifact action.',
          },
          userExplanation: {
            intent: 'choose_valid_action',
            sentence: 'I picked an unavailable action, so I will switch to the right one.',
          },
          observability: { fingerprint: 'artifact.unknown_action' },
        })
      }

      const authz = await authzService.authorizeAction(host, action, actionData, sessionKey)
      if (!authz.allowed) {
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'rbac_denied',
          message: authz.reason ?? 'Forbidden',
          category: 'rbac',
          context: {
            action,
            sessionKey: sessionKey?.slice(0, 40),
            dataKeys: Object.keys(actionData),
            normalizedKeys: normalized.normalizedKeys,
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildErrorEnvelopeWithEscalation(authz.reason ?? 'Forbidden', sessionKey)
      }

      const earlySchemaError = validateActionDataBeforeExpensiveWork(action, actionData)
      if (earlySchemaError) {
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'schema_validation',
          message: `Schema preflight: ${earlySchemaError}`,
          category: 'tool',
          context: {
            action,
            providedKeys: Object.keys(actionData),
            normalizedKeys: normalized.normalizedKeys,
            sessionKey: sessionKey?.slice(0, 40),
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildPreflightError(earlySchemaError, sessionKey, {
          errorCode: 'ARTIFACT_SCHEMA_VALIDATION',
          agentDiagnosis: 'The payload failed schema validation before expensive work started.',
          agentInstruction:
            'Read the validation message, correct the named field or type, and retry once with the corrected payload.',
          correction: {
            summary: 'Correct the missing, unknown, or invalid fields named by schema validation.',
            next_tool_preference: ['describe_action'],
          },
          observability: { fingerprint: 'artifact.schema_validation' },
        })
      }

      const resolverEnabled = isArtifactResolverEnabled()
      const resolved =
        resolverEnabled && conversationId
          ? artifactResolverService.resolve(
              action,
              actionData,
              host.requestContext!.getActiveWorkingSet!(conversationId),
              scope,
            )
          : ({ ok: true, data: actionData } as const)
      if (!resolved.ok && resolved.reason === 'ambiguous') {
        return {
          success: true,
          ui_blocks: [buildArtifactTargetClarificationBlock(action, resolved.candidates)],
        }
      }
      const finalData = resolved.ok ? resolved.data : actionData

      const scopeValidation = validateScopeForAction(action, finalData, scope)
      if (!scopeValidation.ok) {
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'scope_mismatch',
          message: scopeValidation.error,
          category: 'tool',
          context: {
            action,
            providedKeys: Object.keys(finalData),
            sessionKey: sessionKey?.slice(0, 40),
            scope,
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildPreflightError(scopeValidation.error, sessionKey, {
          errorCode: 'ARTIFACT_SCOPE_MISMATCH',
          agentDiagnosis: 'The payload scope conflicts with the active user workspace scope.',
          agentInstruction:
            'Do not retry the same scoped payload. Omit scope fields to use the active scope, or use scope_override:true only when the user explicitly asked for another scope.',
          correction: {
            summary: 'Align the payload with the active scope or intentionally set scope_override.',
          },
          userExplanation: {
            intent: 'correct_scope',
            sentence: 'I used the wrong workspace scope, so I will correct it and try again.',
          },
          observability: { fingerprint: 'artifact.scope_mismatch' },
        })
      }

      const schemaError = validateActionData(action, finalData)
      if (schemaError) {
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'schema_validation',
          message: `Schema preflight: ${schemaError}`,
          category: 'tool',
          context: {
            action,
            providedKeys: Object.keys(finalData),
            normalizedKeys: normalized.normalizedKeys,
            sessionKey: sessionKey?.slice(0, 40),
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildPreflightError(schemaError, sessionKey, {
          errorCode: 'ARTIFACT_SCHEMA_VALIDATION',
          agentDiagnosis: 'The final payload failed schema validation before dispatch.',
          agentInstruction:
            'Read the validation message, correct the named field or type, and retry once with the corrected payload.',
          correction: {
            summary: 'Correct the missing, unknown, or invalid fields named by schema validation.',
            next_tool_preference: ['describe_action'],
          },
          observability: { fingerprint: 'artifact.schema_validation' },
        })
      }

      const actionPreflightError = await validateActionPreflight(action, finalData, {
        host,
        sessionKey,
        onProgress,
      })
      if (actionPreflightError) {
        host.errorReporter?.report({
          app: 'agent-api',
          severity: 'warn',
          feature: 'artifacts',
          error_code: 'action_preflight',
          message: `Action preflight: ${actionPreflightError.error}`,
          category: 'tool',
          context: {
            action,
            providedKeys: Object.keys(finalData),
            normalizedKeys: normalized.normalizedKeys,
            sessionKey: sessionKey?.slice(0, 40),
          },
          user_id: host.resolveUserId?.(sessionKey) ?? undefined,
          agent_key: host.parseAgentIdFromSessionKey?.(sessionKey) ?? undefined,
        })
        return buildPreflightError(actionPreflightError.error, sessionKey, {
          errorCode: actionPreflightError.errorCode ?? 'ARTIFACT_ACTION_PREFLIGHT',
          agentDiagnosis:
            actionPreflightError.agentDiagnosis ??
            'The payload failed action-specific preflight before dispatch.',
          agentInstruction:
            actionPreflightError.agentInstruction ??
            'Correct the named action input and retry once with the corrected payload.',
          correction: actionPreflightError.correction,
          userExplanation: actionPreflightError.userExplanation,
          observability: actionPreflightError.observability ?? {
            fingerprint: 'artifact.action_preflight',
          },
        })
      }

      const result = await handler(finalData, sessionKey, onProgress)
      if (conversationId) {
        this.recordActiveArtifactsFromResult(host, action, finalData, result, conversationId)
      }

      const res = result && typeof result === 'object' ? (result as Record<string, unknown>) : null
      if (res?.success === false) {
        return normalizeFailedActionResult(res, sessionKey)
      }

      const verification = await this.postActionVerifier.verify({
        host,
        action,
        data: finalData,
        result,
        sessionKey,
      })
      if (verification.status === 'failed') {
        return preserveDurableOutputReceipts(verification.failureResult, result)
      }

      recordSessionSuccess(sessionKey)
      return result
    } catch (error) {
      if (action === 'create_ad' || action === 'generate_image') {
        host.logger?.error?.(
          `[artifact-debug] action=${action} failed message=${error instanceof Error ? error.message : String(error)}`,
        )
        host.logger?.error?.(
          `[artifact-debug] action=${action} inputShape=${JSON.stringify({
            keys: Object.keys(data ?? {}),
            hasImageUrl: typeof data?.image_url === 'string' && data.image_url.length > 0,
            hasImageAssetId:
              typeof data?.image_asset_id === 'string' && data.image_asset_id.length > 0,
            hasGeneratedTsx:
              typeof data?.generated_tsx === 'string' && data.generated_tsx.trim().length > 0,
            hasDestinationUrl:
              typeof data?.destination_url === 'string' && data.destination_url.length > 0,
          })}`,
        )
      }

      await host.logError?.(action, error, sessionKey)
      const exposedError = host.resolveCreditAwareError?.(error)
      const rawText = formatArtifactThrownError(error)
      const rawError = rawText.trim().length > 0 ? rawText : null
      return buildErrorEnvelopeWithEscalation(
        exposedError ?? rawError ?? 'Operation failed',
        sessionKey,
      )
    }
  }

  private recordActiveArtifactsFromResult(
    host: ArtifactActionHost,
    action: string,
    data: Record<string, unknown>,
    result: unknown,
    conversationId: string,
  ): void {
    const requestContext = host.requestContext as
      | { setActiveArtifact?: (conversationId: string, artifact: ActiveArtifact) => void }
      | undefined
    if (typeof requestContext?.setActiveArtifact !== 'function') return
    const now = Date.now()

    for (const block of extractUiBlocks(result)) {
      const artifactType =
        typeof block.artifactType === 'string' ? normalizePreviewType(block.artifactType) : ''
      const artifactId = typeof block.artifactId === 'string' ? block.artifactId.trim() : ''
      if (!artifactType || !artifactId) continue
      requestContext.setActiveArtifact(conversationId, {
        type: artifactType,
        id: artifactId,
        label: typeof block.name === 'string' ? block.name : undefined,
        parent: null,
        source: 'created_in_conversation',
        updated_at: now,
      })
      const funnelPageId = typeof block.funnelPageId === 'string' ? block.funnelPageId.trim() : ''
      if (funnelPageId && artifactType === 'funnel') {
        requestContext.setActiveArtifact(conversationId, {
          type: 'funnel_page',
          id: funnelPageId,
          label: typeof block.name === 'string' ? block.name : undefined,
          parent: { type: 'funnel', id: artifactId },
          source: 'created_in_conversation',
          updated_at: now,
        })
      }
    }

    for (const resolvable of getResolvableFieldsForAction(action)) {
      const resolvedId =
        typeof data[resolvable.field] === 'string'
          ? String(data[resolvable.field]).trim()
          : isRecord(result) && typeof result[resolvable.field] === 'string'
            ? String(result[resolvable.field]).trim()
            : ''
      if (!resolvedId) continue
      const parentId =
        resolvable.parentField && typeof data[resolvable.parentField] === 'string'
          ? String(data[resolvable.parentField]).trim()
          : resolvable.parentField &&
              isRecord(result) &&
              typeof result[resolvable.parentField] === 'string'
            ? String(result[resolvable.parentField]).trim()
            : ''
      requestContext.setActiveArtifact(conversationId, {
        type: resolvable.fromArtifactType,
        id: resolvedId,
        parent:
          resolvable.parentArtifactType && parentId
            ? { type: resolvable.parentArtifactType, id: parentId }
            : null,
        source: 'created_in_conversation',
        updated_at: now,
      })
    }
  }
}
