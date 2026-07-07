import { buildDeliveryFailureResult } from './artifact-post-action-error-results'
import {
  getPostActionVerificationPolicy,
  type ArtifactPostActionVerificationPolicy,
  type ArtifactPostActionVerificationStrategy,
} from './artifact-post-action-verification.config'
import { ArtifactPresentationPostActionVerificationService } from './artifact-presentation-post-action-verification.service'

export interface ArtifactPostActionVerificationHost {
  resolveUserId?: (sessionKey?: string) => string | null | undefined
  getUserClient?: (userId: string, sessionKey?: string) => Promise<unknown>
}

export interface ArtifactPostActionVerificationInput {
  host: ArtifactPostActionVerificationHost
  action: string
  data: Record<string, unknown>
  result: unknown
  sessionKey?: string
}

export interface ArtifactPostActionVerificationCheck {
  type: ArtifactPostActionVerificationStrategy | 'result_ack'
  status: 'passed' | 'failed' | 'skipped'
  detail: string
}

export interface ArtifactPostActionVerificationOutcome {
  status: 'verified' | 'not_required' | 'failed'
  checks: ArtifactPostActionVerificationCheck[]
  failureResult?: Record<string, unknown>
}

export interface ArtifactPostActionVerifier {
  verify(input: ArtifactPostActionVerificationInput): Promise<ArtifactPostActionVerificationOutcome>
}

interface DatabaseReference {
  table: string
  id: string
  source: string
}

interface FetchResponseLike {
  ok?: boolean
  status?: number
}

type FetchLike = (
  url: string,
  init?: {
    method?: string
    signal?: AbortSignal
    headers?: Record<string, string>
  },
) => Promise<FetchResponseLike>

const ARTIFACT_TYPE_TABLES: Record<string, string> = {
  presentation: 'presentations',
  presentation_file: 'presentation_files',
  presentation_asset: 'presentation_assets',
  funnel: 'funnels',
  website: 'funnels',
  funnel_page: 'funnel_pages',
  website_page: 'funnel_pages',
  form: 'forms',
  media: 'media_assets',
  media_asset: 'media_assets',
  image: 'media_assets',
  video: 'media_assets',
  document: 'conversation_documents',
  pdf: 'conversation_documents',
  docx: 'conversation_documents',
  space_item: 'space_items',
  task: 'space_items',
  social_post: 'social_posts',
  blog_post: 'blog_posts',
  mission: 'missions',
  agent_skill: 'agent_skills',
  skill_resource: 'agent_skill_resources',
}

const ID_FIELD_TABLES: Record<string, string> = {
  presentation_id: 'presentations',
  presentation_file_id: 'presentation_files',
  presentation_asset_id: 'presentation_assets',
  funnel_id: 'funnels',
  website_id: 'funnels',
  funnel_page_id: 'funnel_pages',
  website_page_id: 'funnel_pages',
  form_id: 'forms',
  media_asset_id: 'media_assets',
  mediaAssetId: 'media_assets',
  document_id: 'conversation_documents',
  space_item_id: 'space_items',
  spaceItemId: 'space_items',
  task_id: 'space_items',
  social_post_id: 'social_posts',
  blog_post_id: 'blog_posts',
  mission_id: 'missions',
  agent_skill_id: 'agent_skills',
  skill_id: 'agent_skills',
  skill_resource_id: 'agent_skill_resources',
  memory_id: 'ns_memories',
  memoryId: 'ns_memories',
  company_signal_id: 'company_cortex_signals',
  company_object_id: 'company_cortex_objects',
}

const ACTION_RESULT_ID_TABLES: Record<string, string> = {
  create_presentation: 'presentations', update_presentation: 'presentations',
  patch_presentation: 'presentations', create_funnel: 'funnels', create_website: 'funnels',
  set_website_layout: 'funnels', create_form: 'forms', update_form: 'forms',
  publish_form: 'forms', unpublish_form: 'forms', save_document: 'conversation_documents',
  create_pdf: 'conversation_documents', create_docx: 'conversation_documents',
  update_document: 'conversation_documents', create_social_post: 'social_posts',
  update_social_post: 'social_posts', schedule_social_post: 'social_posts',
  publish_social_post: 'social_posts', create_blog_post: 'blog_posts',
  update_blog_post: 'blog_posts', create_mission: 'missions', update_mission: 'missions',
  create_agent_skill: 'agent_skills', update_agent_skill: 'agent_skills',
  create_agent_skill_resource: 'agent_skill_resources',
  update_agent_skill_resource: 'agent_skill_resources', copy_skill_resource: 'agent_skill_resources',
  upload_skill_asset: 'agent_skill_resources',
}

const ACTION_RESULT_OBJECT_ID_TABLES: Record<string, Record<string, string>> = {
  log_brain_event: { entry: 'ns_brain_log' },
  create_brain_belief_pattern: { pattern: 'ns_belief_patterns' },
  update_brain_belief_pattern: { pattern: 'ns_belief_patterns' },
}

const URL_KEYS = new Set(
  'url uri file_url public_url signed_url download_url image_url video_url audio_url preview_url published_url storage_url'.split(
    ' ',
  ),
)

const ASSET_PROOF_KEYS = new Set(
  'asset_ref asset_refs media_asset_id mediaAssetId file_id storage_path object_key file_url image_url video_url'.split(
    ' ',
  ),
)

const ACK_KEYS = new Set([
  'id',
  'event_id',
  'provider_id',
  'external_id',
  'message_id',
  'tool_call_id',
  'job_id',
  'run_id',
  'status',
  'recommendation_id',
  'memory_id',
  'memoryId',
  'memories_created',
  'duplicate',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function hasIdLikeData(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(
    ([key, value]) => key === 'id' || (key.endsWith('_id') && !!value),
  )
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

export class ArtifactPostActionVerificationService implements ArtifactPostActionVerifier {
  constructor(
    private readonly options: {
      fetchFn?: FetchLike
      urlTimeoutMs?: number
    } = {},
    private readonly presentationVerifier = new ArtifactPresentationPostActionVerificationService(),
  ) {}

  async verify(
    input: ArtifactPostActionVerificationInput,
  ): Promise<ArtifactPostActionVerificationOutcome> {
    try {
      return await this.verifyInternal(input)
    } catch (error) {
      return this.failed(input, [], `Post-action verification threw: ${this.errorMessage(error)}`)
    }
  }

  private async verifyInternal(
    input: ArtifactPostActionVerificationInput,
  ): Promise<ArtifactPostActionVerificationOutcome> {
    const policy = getPostActionVerificationPolicy(input.action)
    if (policy.status === 'not_required') {
      return {
        status: 'not_required',
        checks: [{ type: 'result_ack', status: 'skipped', detail: policy.reason }],
      }
    }

    const checks: ArtifactPostActionVerificationCheck[] = []

    if (policy.strategies.includes('db_readback')) {
      const dbChecks = await this.verifyDatabaseReadback(input)
      checks.push(...dbChecks)
      const failedDbCheck = dbChecks.find((check) => check.status === 'failed')
      if (failedDbCheck) {
        return this.failed(input, checks, failedDbCheck.detail)
      }
    }

    if (policy.strategies.includes('validation_result')) {
      const validationCheck = this.verifyValidationResult(input.result)
      if (validationCheck) {
        checks.push(validationCheck)
        if (validationCheck.status === 'failed') {
          return this.failed(input, checks, validationCheck.detail)
        }
      }
    }

    if (policy.strategies.includes('asset_ref')) {
      const assetCheck = this.verifyAssetProof(input.result)
      if (assetCheck) checks.push(assetCheck)
    }

    if (policy.strategies.includes('url_accessible')) {
      const urlChecks = await this.verifyUrls(input.result)
      checks.push(...urlChecks)
      const failedUrlCheck = urlChecks.find((check) => check.status === 'failed')
      if (failedUrlCheck) {
        return this.failed(input, checks, failedUrlCheck.detail)
      }
    }

    if (policy.strategies.includes('provider_ack')) {
      const ackCheck = this.verifyProviderAck(input, policy)
      if (ackCheck) checks.push(ackCheck)
    }

    if (policy.strategies.includes('presentation_contract')) {
      const presentationOutcome = await this.presentationVerifier.verify(input)
      if (presentationOutcome) {
        checks.push(...presentationOutcome.checks)
        if (presentationOutcome.status === 'failed') {
          return {
            status: 'failed',
            checks,
            failureResult: presentationOutcome.failureResult,
          }
        }
      }
    }

    if (checks.some((check) => check.status === 'passed')) {
      return { status: 'verified', checks }
    }

    return this.failed(input, checks, `No post-action proof was returned for ${input.action}.`)
  }

  private async verifyDatabaseReadback(
    input: ArtifactPostActionVerificationInput,
  ): Promise<ArtifactPostActionVerificationCheck[]> {
    const refs = this.collectDatabaseReferences(input.action, input.result)
    if (!refs.length) return []

    const userId = nonEmptyString(input.host.resolveUserId?.(input.sessionKey))
    if (!userId || typeof input.host.getUserClient !== 'function') {
      return [
        {
          type: 'db_readback',
          status: 'skipped',
          detail: 'No user database client was available for post-action read-back.',
        },
      ]
    }

    let client: unknown
    try {
      client = await input.host.getUserClient(userId, input.sessionKey)
    } catch (error) {
      return [
        {
          type: 'db_readback',
          status: 'failed',
          detail: `Could not create database client for read-back: ${this.errorMessage(error)}`,
        },
      ]
    }

    return Promise.all(refs.map((ref) => this.verifyDatabaseReference(client, ref)))
  }

  private async verifyDatabaseReference(
    client: unknown,
    ref: DatabaseReference,
  ): Promise<ArtifactPostActionVerificationCheck> {
    if (!isRecord(client) || typeof client.from !== 'function') {
      return {
        type: 'db_readback',
        status: 'skipped',
        detail: 'Database client does not support read-back queries.',
      }
    }

    try {
      const query = client.from(ref.table).select('id').eq('id', ref.id)
      const response =
        typeof query.maybeSingle === 'function'
          ? await query.maybeSingle()
          : typeof query.single === 'function'
            ? await query.single()
            : null
      const data = isRecord(response) ? response.data : null
      const error = isRecord(response) ? response.error : null

      if (error) {
        return {
          type: 'db_readback',
          status: 'failed',
          detail: `${ref.source} could not be read back from ${ref.table}: ${this.errorMessage(error)}`,
        }
      }

      if (!data) {
        return {
          type: 'db_readback',
          status: 'failed',
          detail: `${ref.source} was not found in ${ref.table} after handler success.`,
        }
      }

      return {
        type: 'db_readback',
        status: 'passed',
        detail: `${ref.source} was read back from ${ref.table}.`,
      }
    } catch (error) {
      return {
        type: 'db_readback',
        status: 'failed',
        detail: `${ref.source} read-back threw: ${this.errorMessage(error)}`,
      }
    }
  }

  private verifyValidationResult(result: unknown): ArtifactPostActionVerificationCheck | null {
    const validation = isRecord(result) ? result.validation : null
    const validationRecord = isRecord(validation) ? validation : isRecord(result) ? result : null
    if (!validationRecord) return null

    const failed =
      validationRecord.valid === false ||
      validationRecord.passed === false ||
      validationRecord.success === false
    if (failed) {
      return {
        type: 'validation_result',
        status: 'failed',
        detail: 'Handler returned a failed validation result after reporting success.',
      }
    }

    const passed =
      validationRecord.valid === true ||
      validationRecord.passed === true ||
      validationRecord.validated === true
    if (!passed) return null

    return {
      type: 'validation_result',
      status: 'passed',
      detail: 'Handler returned a passing validation result.',
    }
  }

  private verifyAssetProof(result: unknown): ArtifactPostActionVerificationCheck | null {
    let proof: string | null = null
    walkRecords(result, (key, value) => {
      if (proof || !ASSET_PROOF_KEYS.has(key)) return
      if (typeof value === 'string' && value.trim()) proof = `${key}:${value.trim()}`
      if (Array.isArray(value) && value.length > 0) proof = `${key}:array`
      if (isRecord(value) && Object.keys(value).length > 0) proof = `${key}:object`
    })

    if (!proof) return null

    return {
      type: 'asset_ref',
      status: 'passed',
      detail: `Handler returned asset proof ${proof}.`,
    }
  }

  private async verifyUrls(result: unknown): Promise<ArtifactPostActionVerificationCheck[]> {
    const urls = this.collectUrls(result)
    if (!urls.length) return []

    return Promise.all(urls.map((url) => this.verifyUrl(url)))
  }

  private async verifyUrl(url: string): Promise<ArtifactPostActionVerificationCheck> {
    const fetchFn = this.options.fetchFn ?? (globalThis.fetch as FetchLike | undefined)
    if (typeof fetchFn !== 'function') {
      return {
        type: 'url_accessible',
        status: 'skipped',
        detail: 'No fetch implementation is available for URL verification.',
      }
    }

    const timeoutMs = this.options.urlTimeoutMs ?? 2_500
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const head = await fetchFn(url, { method: 'HEAD', signal: controller.signal })
      if (this.isSuccessfulHttpResponse(head)) {
        return {
          type: 'url_accessible',
          status: 'passed',
          detail: `${url} responded successfully.`,
        }
      }

      if (head.status === 403 || head.status === 405) {
        const get = await fetchFn(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { Range: 'bytes=0-0' },
        })
        if (this.isSuccessfulHttpResponse(get)) {
          return {
            type: 'url_accessible',
            status: 'passed',
            detail: `${url} responded successfully to fallback GET.`,
          }
        }
      }

      return {
        type: 'url_accessible',
        status: 'failed',
        detail: `${url} returned HTTP ${head.status ?? 'unknown'} during post-action verification.`,
      }
    } catch (error) {
      return {
        type: 'url_accessible',
        status: 'failed',
        detail: `${url} could not be reached during post-action verification: ${this.errorMessage(error)}`,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  private verifyProviderAck(
    input: ArtifactPostActionVerificationInput,
    policy: ArtifactPostActionVerificationPolicy,
  ): ArtifactPostActionVerificationCheck | null {
    const result = isRecord(input.result) ? input.result : null
    if (!result) return null

    const ackProof = this.findProviderAckProof(result)
    const isMutationAck =
      result.success === true &&
      (hasIdLikeData(input.data) ||
        input.action.startsWith('delete_') ||
        input.action.startsWith('detach_') ||
        input.action.startsWith('unpublish_') ||
        input.action.startsWith('archive_') ||
        input.action.startsWith('trash_') ||
        input.action.startsWith('cancel_'))

    if (!ackProof && !isMutationAck) return null

    return {
      type: 'provider_ack',
      status: 'passed',
      detail: ackProof
        ? `${policy.reason}; handler returned an acknowledgement (${ackProof}).`
        : `${policy.reason}; handler returned an acknowledgement.`,
    }
  }

  private findProviderAckProof(result: Record<string, unknown>): string | null {
    for (const [key, value] of Object.entries(result)) {
      if (ACK_KEYS.has(key) && this.isProviderAckValue(value)) return key
    }

    let nestedProof: string | null = null
    walkRecords(result, (key, value) => {
      if (nestedProof || !ACK_KEYS.has(key) || !this.isProviderAckValue(value)) return
      nestedProof = key
    })
    return nestedProof
  }

  private isProviderAckValue(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return value > 0
    if (typeof value === 'boolean') return value === true
    if (Array.isArray(value)) return value.length > 0
    return isRecord(value) && Object.keys(value).length > 0
  }

  private collectDatabaseReferences(action: string, result: unknown): DatabaseReference[] {
    const refs = new Map<string, DatabaseReference>()
    const addRef = (table: string | undefined, id: unknown, source: string): void => {
      const cleanId = nonEmptyString(id)
      if (!table || !cleanId) return
      refs.set(`${table}:${cleanId}`, { table, id: cleanId, source })
    }

    const actionTable = this.inferActionTable(action)
    if (isRecord(result)) {
      addRef(actionTable, result.id, `${action} result id`)
      for (const [field, table] of Object.entries(ID_FIELD_TABLES)) {
        addRef(table, result[field], `${action} result ${field}`)
      }
      for (const [field, table] of Object.entries(ACTION_RESULT_OBJECT_ID_TABLES[action] ?? {})) {
        const nested = result[field]
        if (isRecord(nested)) addRef(table, nested.id, `${action} result ${field}.id`)
      }
    }

    walkRecords(result, (key, value) => {
      if (key === 'artifactId' && isRecord(result)) return
      const table = ID_FIELD_TABLES[key]
      if (table) addRef(table, value, `${action} ${key}`)
    })

    if (isRecord(result) && Array.isArray(result.ui_blocks)) {
      for (const block of result.ui_blocks) {
        if (!isRecord(block)) continue
        const artifactType = nonEmptyString(block.artifactType ?? block.artifact_type)
        const artifactId = nonEmptyString(block.artifactId ?? block.artifact_id)
        if (!artifactType || !artifactId) continue
        addRef(ARTIFACT_TYPE_TABLES[artifactType], artifactId, `${action} ui_block ${artifactType}`)
      }
    }

    return Array.from(refs.values())
  }

  private collectUrls(result: unknown): string[] {
    const urls = new Set<string>()
    walkRecords(result, (key, value) => {
      if (!URL_KEYS.has(key)) return
      const url = nonEmptyString(value)
      if (url && isHttpUrl(url)) urls.add(url)
    })
    return Array.from(urls.values())
  }

  private inferActionTable(action: string): string | undefined {
    return ACTION_RESULT_ID_TABLES[action]
  }

  private isSuccessfulHttpResponse(response: FetchResponseLike | null | undefined): boolean {
    const status = response?.status
    if (typeof response?.ok === 'boolean') return response.ok
    return typeof status === 'number' && status >= 200 && status < 400
  }

  private failed(
    input: ArtifactPostActionVerificationInput,
    checks: ArtifactPostActionVerificationCheck[],
    detail: string,
  ): ArtifactPostActionVerificationOutcome {
    return {
      status: 'failed',
      checks,
      failureResult: buildDeliveryFailureResult(input, detail),
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
