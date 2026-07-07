import type { PageCapture } from './types'

export type ExtensionMessage =
  | { type: 'SET_LAST_SCOPE'; scope: import('./types').BrainScopeOption }
  | { type: 'GET_CAPTURE'; tabId?: number }
  | { type: 'CAPTURE_PAGE_RESPONSE'; payload: PageCapture | null }
  | { type: 'GET_SESSION' }
  | { type: 'SESSION_RESPONSE'; authenticated: boolean; email?: string }
  | { type: 'GET_SCOPES' }
  | { type: 'SCOPES_RESPONSE'; scopes: import('./types').BrainScopeOption[]; error?: string }
  | { type: 'SEND_CAPTURE'; scope: import('./types').BrainScopeOption; capture: PageCapture; mode: 'url' | 'selection' | 'article' }
  | { type: 'SEND_RESULT'; ok: boolean; error?: string; jobId?: string }
  | { type: 'SEARCH_BRAIN'; query: string; brainId?: string; agentId?: string }
  | { type: 'SEARCH_RESULT'; ok: boolean; results?: unknown; error?: string }
  | { type: 'QUEUE_LIST' }
  | { type: 'QUEUE_RESULT'; ok: boolean; jobs?: unknown[]; error?: string }
  | { type: 'OPEN_APP_LOGIN' }
  | { type: 'LIST_CONVERSATIONS'; agent_id?: string; campaign_id?: string }
  | { type: 'CREATE_CONVERSATION'; title?: string; campaign_id?: string; agent_id?: string }
  | { type: 'FETCH_MESSAGES'; conversation_id: string; limit?: number }
  | { type: 'LIST_MISSIONS'; status?: string; campaign_id?: string; limit?: number }
  | { type: 'GET_MY_ORGS' }
  | { type: 'SIGN_OUT' }
  | { type: 'LIST_BROWSER_SESSIONS' }
  | { type: 'FORGET_DOMAIN'; domain: string }
  | { type: 'SET_DOMAIN_DISABLED'; domain: string; disabled: boolean }
  | { type: 'FORCE_SYNC_DOMAIN'; domain: string }
  | { type: 'CHECK_CONSENT_STATUS' }
  | { type: 'SET_CONSENT' }
  | { type: 'TRANSCRIBE_AUDIO'; audioBase64: string; mimeType: string }
  | { type: 'FETCH_LLM_MODELS' }

export function isExtensionMessage(x: unknown): x is ExtensionMessage {
  return typeof x === 'object' && x !== null && 'type' in x && typeof (x as { type: unknown }).type === 'string'
}
