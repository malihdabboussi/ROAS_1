import {
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  CONVERSATION_ACTIONS_TOAST_SUCCESS,
} from '@/lib/conversations/conversation-toast-errors.config'

// ─── Reporting ───────────────────────────────────────────────────────────────
export const SPACES_REPORTING_TOAST_ERRORS = {
  CAMPAIGN_OVERVIEW_LOAD_FAILED: { userMessage: 'Failed to load campaign overview.' },
  FUNNEL_ANALYTICS_LOAD_FAILED: { userMessage: 'Failed to load funnel analytics.' },
  EMAIL_ANALYTICS_LOAD_FAILED: { userMessage: 'Failed to load email analytics.' },
} as const

// ─── Cells ───────────────────────────────────────────────────────────────────
export const SPACES_CELL_TOAST_ERRORS = {
  INVALID_NUMBER: { userMessage: 'Enter a valid number (0–100).' },
  INVALID_EMAIL: { userMessage: 'Enter a valid email address.' },
  INVALID_AMOUNT: { userMessage: 'Enter a valid amount.' },
  INVALID_DURATION: { userMessage: 'Enter valid hours and minutes.' },
  INVALID_PHONE: { userMessage: 'Enter a valid phone number (min 7 digits).' },
  INVALID_GENERIC_NUMBER: { userMessage: 'Enter a valid number.' },
  INVALID_URL: { userMessage: 'Enter a valid URL.' },
  RECURRING_REQUIRES_DUE_DATE: { userMessage: 'Recurring tasks require a due date.' },
  PUSH_TO_AGENT_FAILED: { userMessage: 'Failed to push to agent.' },
} as const

export const SPACES_CELL_TOAST_SUCCESS = {
  PROGRESS_CLEARED: { userMessage: 'Progress cleared.' },
  PROGRESS_SAVED: { userMessage: 'Progress saved.' },
  EMAIL_CLEARED: { userMessage: 'Email cleared.' },
  EMAIL_SAVED: { userMessage: 'Email saved.' },
  AMOUNT_CLEARED: { userMessage: 'Amount cleared.' },
  AMOUNT_SAVED: { userMessage: 'Amount saved.' },
  DURATION_CLEARED: { userMessage: 'Duration cleared.' },
  DURATION_SAVED: { userMessage: 'Duration saved.' },
  PHONE_CLEARED: { userMessage: 'Phone cleared.' },
  PHONE_SAVED: { userMessage: 'Phone saved.' },
  NUMBER_CLEARED: { userMessage: 'Number cleared.' },
  NUMBER_SAVED: { userMessage: 'Number saved.' },
  URL_CLEARED: { userMessage: 'URL cleared.' },
  URL_SAVED: { userMessage: 'URL saved.' },
  MISSION_CREATED: { userMessage: 'Mission created from space item.' },
} as const

// ─── Sharing ─────────────────────────────────────────────────────────────────
export const SPACES_SHARE_TOAST_ERRORS = {
  LOAD_SHARES_FAILED: { userMessage: 'Failed to load sharing data — try again.' },
  INVITE_FAILED: { userMessage: 'Failed to invite user — try again.' },
  CHANGE_PERMISSION_FAILED: { userMessage: 'Failed to change permission — try again.' },
  UPDATE_SHARE_FAILED: { userMessage: 'Failed to update share — try again.' },
  UPDATE_ORG_SHARE_FAILED: { userMessage: 'Failed to update organization share — try again.' },
  UPDATE_VISIBILITY_FAILED: { userMessage: 'Failed to update visibility — try again.' },
  LOAD_VIEW_SHARES_FAILED: { userMessage: 'Failed to load view shares — try again.' },
  SHARE_VIEW_FAILED: { userMessage: 'Failed to share view — try again.' },
  REMOVE_VIEW_SHARE_FAILED: { userMessage: 'Failed to remove view share — try again.' },
  SELECT_MEMBER_REQUIRED: { userMessage: 'Select a workspace member by name or email.' },
  LOAD_CONVERSATION_SHARES_FAILED: { userMessage: 'Failed to load shares — try again.' },
  INVITE_USER_FAILED: { userMessage: 'Failed to invite user — try again.' },
  UPDATE_CONVERSATION_SHARE_FAILED: { userMessage: 'Failed to update share — try again.' },
} as const

export const SPACES_SHARE_TOAST_SUCCESS = {
  SHARE_UPDATED: { userMessage: 'Share updated.' },
} as const

// ─── Space actions ────────────────────────────────────────────────────────────
export const SPACES_ACTIONS_TOAST_ERRORS = {
  DELETE_SPACE_FAILED: { userMessage: 'Failed to delete space — try again.' },
  CREATE_ARTIFACT_FAILED: { userMessage: 'Could not create artifact — try again.' },
  COMPLETE_LINKED_MISSION_STEP_FAILED: {
    userMessage: 'Could not complete the linked Mission step — try again.',
  },
  LINKED_AGENT_STEP_STATUS_MANAGED: {
    userMessage: 'This task follows its agent-owned Mission step automatically.',
  },
  UNDO_FAILED: { userMessage: 'Could not update those task changes.' },
  REDO_NOTHING: { userMessage: 'Nothing to redo; sync cleared.' },
  UNDO_PARTIAL: { userMessage: 'Some changes could not be reverted.' },
  ...CONVERSATION_ACTIONS_TOAST_ERRORS,
  SAVE_CONTACT_EMAIL_FAILED: { userMessage: 'Failed to send email — try again.' },
  LINK_CONVERSATION_FAILED: { userMessage: 'Failed to link conversation — try again.' },
  VISUALIZE_DOC_FAILED: { userMessage: "Couldn't visualize this doc — try again." },
  CREATE_GOOGLE_DOC_FAILED: {
    userMessage: "Couldn't create the Google Doc — check your Drive connection and try again.",
  },
  SAVE_GOOGLE_DOC_LINK_FAILED: {
    userMessage: 'Google Doc created, but its link could not be saved to Vibey.',
  },
} as const

export function resolveSpaceTaskUpdateError(linkedMissionStep: boolean, markedDone: boolean) {
  return linkedMissionStep && markedDone
    ? SPACES_ACTIONS_TOAST_ERRORS.COMPLETE_LINKED_MISSION_STEP_FAILED.userMessage
    : 'Failed to update task'
}

export const SPACES_ACTIONS_TOAST_SUCCESS = {
  ...CONVERSATION_ACTIONS_TOAST_SUCCESS,
  GOOGLE_DOC_CREATED: { userMessage: 'Google Doc created and linked.' },
} as const

// ─── Calendar ────────────────────────────────────────────────────────────────
export const SPACES_CALENDAR_TOAST_ERRORS = {
  CREATE_TASK_FAILED: { userMessage: 'Could not add task to the calendar.' },
  UPDATE_PROVIDER_EVENT_FAILED: { userMessage: 'Could not update calendar event.' },
  CONNECT_CALENDAR_FAILED: { userMessage: 'Could not start calendar connection.' },
} as const

export const SPACES_CALENDAR_TOAST_SUCCESS = {
  TASK_CREATED: { userMessage: 'Task added to calendar.' },
  PROVIDER_EVENT_UPDATED: { userMessage: 'Calendar event updated.' },
} as const

// ─── Automation ──────────────────────────────────────────────────────────────
export const SPACES_AUTOMATION_TOAST_ERRORS = {
  UPDATE_FAILED: { userMessage: 'Could not update flow — try again.' },
  RENAME_FAILED: { userMessage: 'Could not rename — try again.' },
  INSTALL_TEMPLATE_FAILED: { userMessage: 'Could not install template — try again.' },
} as const

// ─── Artifact menu actions (shared pattern) ───────────────────────────────────
export const SPACES_ARTIFACT_TOAST_ERRORS = {
  RENAME_FAILED: { userMessage: 'Failed to rename — try again.' },
  DUPLICATE_FAILED: { userMessage: 'Failed to duplicate — try again.' },
  MOVE_FAILED: { userMessage: 'Failed to move — try again.' },
  COPY_FAILED: { userMessage: 'Failed to copy — try again.' },
  DELETE_FAILED: { userMessage: 'Failed to delete — try again.' },
  COPY_LINK_FAILED: { userMessage: 'Failed to copy link.' },
  OPEN_ANALYTICS_FAILED: { userMessage: 'Failed to open analytics.' },
  PUBLISH_FAILED: { userMessage: 'Failed to publish — try again.' },
  UNPUBLISH_FAILED: { userMessage: 'Failed to unpublish — try again.' },
  CONNECT_DOMAIN_FAILED: { userMessage: 'Failed to connect domain — try again.' },
  MARK_READY_FAILED: { userMessage: 'Failed to mark as ready — try again.' },
  MOVE_TO_DRAFT_FAILED: { userMessage: 'Failed to move to draft — try again.' },
  UNSCHEDULE_FAILED: { userMessage: 'Failed to unschedule — try again.' },
  EXPORT_RESPONSES_FAILED: { userMessage: 'Failed to export responses — try again.' },
  FORM_TARGET_SPACE_MISSING: { userMessage: 'No target space set on this form.' },
  FORM_TARGET_SPACE_NOT_FOUND: { userMessage: 'Target space not found.' },
  FORM_NO_RESPONSES: { userMessage: 'No responses yet.' },
} as const

export const SPACES_ARTIFACT_TOAST_SUCCESS = {
  RENAMED: { userMessage: 'Renamed.' },
  DUPLICATED: { userMessage: 'Duplicated.' },
  MOVED: { userMessage: 'Moved.' },
  COPIED: { userMessage: 'Copied.' },
  DELETED: { userMessage: 'Deleted.' },
  MARKED_AS_READY: { userMessage: 'Marked as ready.' },
  MOVED_TO_DRAFT: { userMessage: 'Moved to draft.' },
  SCHEDULE_REMOVED: { userMessage: 'Schedule removed.' },
  PUBLISHED: { userMessage: 'Published.' },
  UNPUBLISHED: { userMessage: 'Unpublished.' },
  DOMAIN_CONNECTED: { userMessage: 'Custom domain connected.' },
  RESPONSES_EXPORTED: { userMessage: 'Responses exported.' },
  RESPONSES_VIEW_CREATED: { userMessage: 'Responses view created.' },
  FORM_LINK_COPIED: { userMessage: 'Form link copied.' },
  EMAIL_DRAFT_SAVED: { userMessage: 'Email draft saved.' },
} as const

// ─── Your-turn feed ───────────────────────────────────────────────────────────
export const SPACES_YOUR_TURN_TOAST_ERRORS = {
  ACCEPT_FAILED: { userMessage: 'Could not accept — try again.' },
  DISMISS_FAILED: { userMessage: 'Could not dismiss — try again.' },
} as const
