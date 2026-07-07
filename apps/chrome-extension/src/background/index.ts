import { getAppOrigin } from '../shared/config'
import type { ExtensionMessage } from '../shared/messages'
import type { BrainScopeOption, PageCapture } from '../shared/types'
import {
  sendCapture as apiSendCapture,
  fetchScopes,
  listQueue,
  searchBrain,
  listConversations,
  createConversation,
  fetchConversationMessages,
  listMissions,
  fetchMyOrgs,
  syncBrowserCookies,
  type BrowserSessionCookie,
  listBrowserSessions,
  deleteBrowserSession,
  setDomainDisabled as apiSetDomainDisabled,
  fetchDomainConfig,
  getConsentStatus,
  recordConsent,
  transcribeAudio,
  fetchLlmModels,
  type BrowserSessionSummary,
} from './api'
import { registerChatStreamPort } from './chat-stream'
import { clearSession, getCachedOrRefreshSession } from './auth'
import { buildScopeOptions } from './scopes'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_MODES = new Set(['url', 'selection', 'article'])
const VALID_SCOPE_TYPES = new Set(['user', 'agent', 'campaign'])

const MENU_SEND_SELECTION = 'vibey-send-selection'
const MENU_SEND_PAGE = 'vibey-send-page-url'

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SEND_SELECTION,
      title: 'Send selection to your Brain',
      contexts: ['selection'],
    })
    chrome.contextMenus.create({
      id: MENU_SEND_PAGE,
      title: 'Send page link to your Brain',
      contexts: ['page', 'frame'],
    })
  })
}

let lastScope: BrainScopeOption | null = null
const COOKIE_SYNC_MIN_INTERVAL_MS = 2 * 60 * 1000
const BASELINE_COOKIE_SYNC_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'linkedin.com',
  'youtube.com',
  'reddit.com',
] as const

const DOMAIN_CONFIG_ALARM = 'vibey-browser-domain-config'
const EXPIRY_BADGE_ALARM = 'vibey-browser-expiry-badge'

const cookieSyncState = new Map<string, { lastSyncAt: number; lastHash: string }>()
let dynamicDomains: string[] = Array.from(BASELINE_COOKIE_SYNC_DOMAINS)

async function loadDynamicDomains(): Promise<string[]> {
  try {
    const cached = await chrome.storage.local.get('browserDomainConfig')
    const cachedDomains = cached?.browserDomainConfig?.domains
    if (Array.isArray(cachedDomains) && cachedDomains.length > 0) {
      dynamicDomains = cachedDomains.map(String)
    }
  } catch {
    /* keep baseline */
  }
  return dynamicDomains
}

async function refreshDomainConfigFromServer(): Promise<void> {
  try {
    const domains = await fetchDomainConfig()
    if (Array.isArray(domains) && domains.length > 0) {
      dynamicDomains = domains
      await chrome.storage.local.set({
        browserDomainConfig: { domains, fetchedAt: Date.now() },
      })
    }
  } catch {
    // keep whatever we have (cached or baseline)
  }
}

function resolveCookieSyncDomain(urlRaw: string | undefined): string | null {
  if (!urlRaw) return null
  try {
    const url = new URL(urlRaw)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    for (const domain of dynamicDomains) {
      if (host === domain || host.endsWith(`.${domain}`)) return domain
    }
    return null
  } catch {
    return null
  }
}

function normalizeCookieSameSite(
  sameSite?: chrome.cookies.Cookie['sameSite'],
): BrowserSessionCookie['sameSite'] | undefined {
  if (sameSite === 'lax') return 'Lax'
  if (sameSite === 'strict') return 'Strict'
  if (sameSite === 'no_restriction') return 'None'
  return undefined
}

function hashCookies(cookies: BrowserSessionCookie[]): string {
  return JSON.stringify(
    cookies.map((cookie) => [
      cookie.name,
      cookie.value,
      cookie.domain ?? '',
      cookie.path ?? '',
      cookie.expires ?? 0,
      cookie.secure ?? false,
      cookie.httpOnly ?? false,
      cookie.sameSite ?? '',
    ]),
  )
}

async function hasConsent(): Promise<boolean> {
  try {
    const local = await chrome.storage.local.get('browserConsentAt')
    if (local?.browserConsentAt) return true
    const remote = await getConsentStatus()
    if (remote) {
      await chrome.storage.local.set({ browserConsentAt: remote })
      return true
    }
    return false
  } catch {
    return false
  }
}

async function isDomainDisabledLocally(domain: string): Promise<boolean> {
  try {
    const local = await chrome.storage.local.get('disabledDomains')
    const list = Array.isArray(local?.disabledDomains)
      ? (local.disabledDomains as string[])
      : []
    return list.includes(domain)
  } catch {
    return false
  }
}

async function notifyFirstSync(domain: string): Promise<void> {
  try {
    const local = await chrome.storage.local.get('notifiedSyncDomains')
    const list = Array.isArray(local?.notifiedSyncDomains)
      ? (local.notifiedSyncDomains as string[])
      : []
    if (list.includes(domain)) return
    const next = [...list, domain]
    await chrome.storage.local.set({ notifiedSyncDomains: next })
    chrome.notifications.create(`vibey-sync-${domain}-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title: 'Session saved to Vibey',
      message: `Your ${domain} session is now available to your Vibey agents.`,
    })
  } catch {
    /* notification failures shouldn't break sync */
  }
}

async function refreshBadge(): Promise<void> {
  try {
    const sessions = await listBrowserSessions().catch(() => [] as BrowserSessionSummary[])
    const active = sessions.filter((s) => !s.disabled_at)
    const threshold = Date.now() + 3 * 24 * 60 * 60 * 1000
    const expiring = active.some((s) => {
      if (!s.min_expires_at) return false
      const ts = new Date(s.min_expires_at).getTime()
      return Number.isFinite(ts) && ts <= threshold
    })

    if (active.length === 0) {
      await chrome.action.setBadgeText({ text: '' })
      return
    }
    if (expiring) {
      await chrome.action.setBadgeBackgroundColor({ color: '#DC2626' })
      await chrome.action.setBadgeText({ text: '!' })
      return
    }
    await chrome.action.setBadgeBackgroundColor({ color: '#16A34A' })
    await chrome.action.setBadgeText({ text: String(active.length) })
  } catch {
    /* badge is cosmetic; ignore errors */
  }
}

async function syncCookiesForDomain(domain: string): Promise<void> {
  const now = Date.now()
  const prev = cookieSyncState.get(domain)
  if (prev && now - prev.lastSyncAt < COOKIE_SYNC_MIN_INTERVAL_MS) {
    return
  }

  const consent = await hasConsent()
  if (!consent) return
  const localDisabled = await isDomainDisabledLocally(domain)
  if (localDisabled) return

  const cookies = await chrome.cookies.getAll({ domain })
  if (!Array.isArray(cookies) || cookies.length === 0) return

  const payload: BrowserSessionCookie[] = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: typeof cookie.expirationDate === 'number' ? cookie.expirationDate : undefined,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: normalizeCookieSameSite(cookie.sameSite),
  }))

  const nextHash = hashCookies(payload)
  if (prev && prev.lastHash === nextHash) {
    cookieSyncState.set(domain, { lastSyncAt: now, lastHash: nextHash })
    return
  }

  let ok = false
  try {
    ok = await syncBrowserCookies(domain, payload)
  } catch {
    ok = false
  }
  if (ok) {
    cookieSyncState.set(domain, { lastSyncAt: now, lastHash: nextHash })
    try {
      chrome.runtime.sendMessage({ type: 'BROWSER_SESSIONS_UPDATED', domain })
    } catch {
      /* no listeners */
    }
    void notifyFirstSync(domain)
    void refreshBadge()
  }
}

async function maybeSyncCookiesForUrl(urlRaw: string | undefined): Promise<void> {
  const domain = resolveCookieSyncDomain(urlRaw)
  if (!domain) return
  try {
    await syncCookiesForDomain(domain)
  } catch {
    // Keep cookie sync silent; chat should still work even when sync fails.
  }
}

async function openSidepanelForConsent(): Promise<void> {
  try {
    const consented = await hasConsent()
    if (consented) return
    const win = await chrome.windows.getCurrent()
    if (win.id != null) {
      await chrome.sidePanel.open({ windowId: win.id })
    }
  } catch {
    /* best-effort */
  }
}

async function captureTab(tabId: number): Promise<PageCapture | null> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    })
    const res = (await chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_PAGE' })) as PageCapture | null
    return res ?? null
  } catch {
    return null
  }
}

async function handleSend(
  tabId: number | undefined,
  scope: BrainScopeOption,
  mode: 'url' | 'selection' | 'article',
): Promise<{ ok: boolean; error?: string; jobId?: string }> {
  let tab = tabId != null ? await chrome.tabs.get(tabId).catch(() => null) : null
  if (!tab?.id) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
    tab = active
  }
  if (!tab?.id) return { ok: false, error: 'No active tab' }
  const cap = await captureTab(tab.id)
  if (!cap) return { ok: false, error: 'Could not read page — try refreshing the tab.' }
  try {
    const { jobId } = await apiSendCapture(scope, cap, mode)
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title: 'Vibey Mini',
      message: 'Queued for your brain',
    })
    return { ok: true, jobId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

registerContextMenus()
registerChatStreamPort()

void loadDynamicDomains().then(() => void refreshDomainConfigFromServer())
void refreshBadge()

try {
  chrome.alarms.create(DOMAIN_CONFIG_ALARM, { periodInMinutes: 360 })
  chrome.alarms.create(EXPIRY_BADGE_ALARM, { periodInMinutes: 360 })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DOMAIN_CONFIG_ALARM) {
      void refreshDomainConfigFromServer()
    } else if (alarm.name === EXPIRY_BADGE_ALARM) {
      void refreshBadge()
    }
  })
} catch {
  /* alarms API not available */
}

chrome.runtime.onInstalled.addListener((details) => {
  registerContextMenus()
  void (async () => {
    await loadDynamicDomains()
    void refreshDomainConfigFromServer()
    if (details.reason === 'install' || details.reason === 'update') {
      void openSidepanelForConsent()
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    void maybeSyncCookiesForUrl(tabs[0]?.url)
    void refreshBadge()
  })()
})

chrome.runtime.onStartup?.addListener(() => {
  void (async () => {
    await loadDynamicDomains()
    void refreshDomainConfigFromServer()
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    void maybeSyncCookiesForUrl(tabs[0]?.url)
    void refreshBadge()
  })()
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

chrome.tabs.onActivated.addListener((activeInfo) => {
  void chrome.tabs.get(activeInfo.tabId).then((tab) => maybeSyncCookiesForUrl(tab.url))
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  void maybeSyncCookiesForUrl(tab.url)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void (async () => {
    const scopes = await loadScopesInternal()
    const scope = lastScope ?? scopes[0]
    if (!scope || !tab?.id) return
    const mode = info.menuItemId === MENU_SEND_SELECTION ? 'selection' : 'url'
    await handleSend(tab.id, scope, mode)
  })()
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-side-panel') {
    void chrome.windows.getCurrent().then((w) => {
      if (w.id != null) void chrome.sidePanel.open({ windowId: w.id })
    })
  }
})

async function loadScopesInternal(): Promise<BrainScopeOption[]> {
  try {
    const { brains, campaigns } = await fetchScopes()
    return buildScopeOptions(brains, campaigns)
  } catch {
    return [
      {
        id: 'user',
        label: 'Your Brain',
        scopeType: 'user',
        brainId: null,
        campaignId: null,
        agentKey: null,
      },
    ]
  }
}

function reject(sendResponse: (r: unknown) => void, msg: string) {
  sendResponse({ ok: false, error: msg })
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _s, sendResponse: (r: unknown) => void) => {
    if (!message || typeof message !== 'object' || !('type' in message)) return

    if (message.type === 'SET_LAST_SCOPE') {
      if (!message.scope || !VALID_SCOPE_TYPES.has(message.scope.scopeType)) {
        reject(sendResponse, 'Invalid scope')
        return
      }
      lastScope = message.scope
      sendResponse({ ok: true })
      return
    }

    if (message.type === 'GET_SESSION') {
      void getCachedOrRefreshSession().then((s) => {
        sendResponse({ type: 'SESSION_RESPONSE', authenticated: !!s })
      })
      return true
    }

    if (message.type === 'GET_SCOPES') {
      void (async () => {
        try {
          const scopes = await loadScopesInternal()
          sendResponse({ type: 'SCOPES_RESPONSE', scopes })
        } catch (e) {
          sendResponse({
            type: 'SCOPES_RESPONSE',
            scopes: [],
            error: e instanceof Error ? e.message : String(e),
          })
        }
      })()
      return true
    }

    if (message.type === 'GET_CAPTURE') {
      void (async () => {
        let id = message.tabId
        if (id == null) {
          const [t] = await chrome.tabs.query({ active: true, currentWindow: true })
          id = t?.id
        }
        if (id == null) {
          sendResponse({ type: 'CAPTURE_PAGE_RESPONSE', payload: null })
          return
        }
        const payload = await captureTab(id)
        sendResponse({ type: 'CAPTURE_PAGE_RESPONSE', payload })
      })()
      return true
    }

    if (message.type === 'SEND_CAPTURE') {
      if (!VALID_MODES.has(message.mode)) { reject(sendResponse, 'Invalid mode'); return }
      if (!message.scope || !VALID_SCOPE_TYPES.has(message.scope.scopeType)) { reject(sendResponse, 'Invalid scope'); return }
      void (async () => {
        const [t] = await chrome.tabs.query({ active: true, currentWindow: true })
        const result = await handleSend(t?.id, message.scope, message.mode)
        sendResponse({ type: 'SEND_RESULT', ...result })
      })()
      return true
    }

    if (message.type === 'SEARCH_BRAIN') {
      if (typeof message.query !== 'string' || message.query.length === 0 || message.query.length > 500) { reject(sendResponse, 'Invalid query'); return }
      void (async () => {
        try {
          const results = await searchBrain(message.query, message.brainId, message.agentId)
          sendResponse({ type: 'SEARCH_RESULT', ok: true, results })
        } catch (e) {
          sendResponse({
            type: 'SEARCH_RESULT',
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          })
        }
      })()
      return true
    }

    if (message.type === 'QUEUE_LIST') {
      void (async () => {
        try {
          const jobs = await listQueue()
          sendResponse({ type: 'QUEUE_RESULT', ok: true, jobs })
        } catch (e) {
          sendResponse({
            type: 'QUEUE_RESULT',
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          })
        }
      })()
      return true
    }

    if (message.type === 'OPEN_APP_LOGIN') {
      void chrome.tabs.create({ url: `${getAppOrigin().replace(/\/$/, '')}/login` })
      return
    }

    if (message.type === 'LIST_CONVERSATIONS') {
      void (async () => {
        try {
          const conversations = await listConversations(message.agent_id, message.campaign_id)
          sendResponse({ ok: true, conversations })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'CREATE_CONVERSATION') {
      void (async () => {
        try {
          const conversation = await createConversation({
            title: message.title,
            campaign_id: message.campaign_id,
            agent_id: message.agent_id,
          })
          sendResponse({ ok: true, conversation })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'FETCH_MESSAGES') {
      if (!message.conversation_id || !UUID_RE.test(message.conversation_id)) { reject(sendResponse, 'Invalid conversation_id'); return }
      void (async () => {
        try {
          const messages = await fetchConversationMessages(message.conversation_id, message.limit)
          sendResponse({ ok: true, messages })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'FETCH_LLM_MODELS') {
      void (async () => {
        try {
          const models = await fetchLlmModels()
          sendResponse({ ok: true, models })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'LIST_MISSIONS') {
      void (async () => {
        try {
          const missions = await listMissions({
            status: message.status,
            campaign_id: message.campaign_id,
            limit: message.limit ?? 40,
          })
          sendResponse({ ok: true, missions })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'GET_MY_ORGS') {
      void (async () => {
        try {
          const memberships = await fetchMyOrgs()
          sendResponse({ ok: true, memberships })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'SIGN_OUT') {
      void (async () => {
        await clearSession()
        sendResponse({ ok: true })
      })()
      return true
    }

    if (message.type === 'LIST_BROWSER_SESSIONS') {
      void (async () => {
        try {
          const sessions = await listBrowserSessions()
          sendResponse({ ok: true, sessions })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'FORGET_DOMAIN') {
      const domain = String(message.domain ?? '').trim().toLowerCase()
      if (!domain) { reject(sendResponse, 'Invalid domain'); return }
      void (async () => {
        try {
          await deleteBrowserSession(domain)
          cookieSyncState.delete(domain)
          try {
            const local = await chrome.storage.local.get('notifiedSyncDomains')
            const list = Array.isArray(local?.notifiedSyncDomains)
              ? (local.notifiedSyncDomains as string[])
              : []
            await chrome.storage.local.set({
              notifiedSyncDomains: list.filter((d) => d !== domain),
            })
          } catch {
            /* ignore */
          }
          void refreshBadge()
          sendResponse({ ok: true })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'SET_DOMAIN_DISABLED') {
      const domain = String(message.domain ?? '').trim().toLowerCase()
      if (!domain) { reject(sendResponse, 'Invalid domain'); return }
      void (async () => {
        try {
          await apiSetDomainDisabled(domain, Boolean(message.disabled))
          try {
            const local = await chrome.storage.local.get('disabledDomains')
            const list = Array.isArray(local?.disabledDomains)
              ? (local.disabledDomains as string[])
              : []
            const next = message.disabled
              ? Array.from(new Set([...list, domain]))
              : list.filter((d) => d !== domain)
            await chrome.storage.local.set({ disabledDomains: next })
          } catch {
            /* ignore */
          }
          void refreshBadge()
          sendResponse({ ok: true })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'FORCE_SYNC_DOMAIN') {
      const domain = String(message.domain ?? '').trim().toLowerCase()
      if (!domain) { reject(sendResponse, 'Invalid domain'); return }
      void (async () => {
        cookieSyncState.delete(domain)
        await syncCookiesForDomain(domain)
        sendResponse({ ok: true })
      })()
      return true
    }

    if (message.type === 'CHECK_CONSENT_STATUS') {
      void (async () => {
        try {
          const local = await chrome.storage.local.get('browserConsentAt')
          if (local?.browserConsentAt) {
            sendResponse({ ok: true, consent_at: local.browserConsentAt })
            return
          }
          const remote = await getConsentStatus()
          if (remote) {
            await chrome.storage.local.set({ browserConsentAt: remote })
          }
          sendResponse({ ok: true, consent_at: remote })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'TRANSCRIBE_AUDIO') {
      if (typeof message.audioBase64 !== 'string' || message.audioBase64.length === 0) {
        reject(sendResponse, 'Invalid audio')
        return
      }
      void (async () => {
        try {
          const text = await transcribeAudio(message.audioBase64, message.mimeType || 'audio/webm')
          sendResponse({ ok: true, text })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    if (message.type === 'SET_CONSENT') {
      void (async () => {
        try {
          const consent_at = await recordConsent()
          if (consent_at) {
            await chrome.storage.local.set({ browserConsentAt: consent_at })
          }
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
          void maybeSyncCookiesForUrl(tabs[0]?.url)
          sendResponse({ ok: true, consent_at })
        } catch (e) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    return undefined
  },
)
