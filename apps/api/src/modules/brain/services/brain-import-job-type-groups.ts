import type { BrainImportJobType } from './brain-import-jobs.types'

/**
 * Job-type groups shared by the queue views, stats and post-run hooks. A new
 * import door adds its job type here once instead of in every repository.
 */

/** Personal-brain imports: shown in the user queue, counted in personal stats. */
export const USER_BRAIN_IMPORT_JOB_TYPES: BrainImportJobType[] = [
  'document_remember',
  'user_link_import',
  'fathom_meeting_import',
  'fireflies_transcript_import',
  'meeting_transcript_import',
]

/** Campaign-brain imports: shown when the queue is scoped to a campaign. */
export const CAMPAIGN_BRAIN_IMPORT_JOB_TYPES: BrainImportJobType[] = [
  'campaign_file_import',
  'campaign_fathom_import',
  'campaign_fireflies_import',
  'campaign_meeting_import',
  'campaign_url_import',
  'page_grader_brain_sync',
]

/** Unscoped queue view: personal imports plus agent-brain training. */
export const QUEUE_VISIBLE_IMPORT_JOB_TYPES: BrainImportJobType[] = [
  'document_remember',
  'user_link_import',
  'sk_ingest',
  'sk_link_ingest',
  'fathom_meeting_import',
  'fireflies_transcript_import',
  'meeting_transcript_import',
]

/** Meeting imports that trigger campaign cross-pollination suggestions after success. */
export const CROSS_POLLINATION_JOB_TYPES: BrainImportJobType[] = [
  'fathom_meeting_import',
  'fireflies_transcript_import',
  'meeting_transcript_import',
]
