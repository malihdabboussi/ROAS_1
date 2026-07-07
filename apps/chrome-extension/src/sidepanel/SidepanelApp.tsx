import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppOrigin } from '../shared/config'
import { sendExtensionMessage } from '../shared/chrome-utils'
import type { BrainScopeOption, OrgMembership, PageCapture } from '../shared/types'
import { VibeyOrbLoader } from '../ui/VibeyOrbLoader'
import { BrainCaptureTab } from './tabs/BrainCaptureTab'
import { ChatTab } from './tabs/ChatTab'
import { ConsentOnboarding } from './tabs/ConsentOnboarding'
import { MissionsTab } from './tabs/MissionsTab'
import { SessionsTab } from './tabs/SessionsTab'

type Mode = 'url' | 'selection' | 'article'

type PanelTab = 'chat' | 'brain' | 'missions' | 'sessions'

type HistoryEntry = { at: string; title: string; url: string; scope: string; mode: string }

const NAV_ITEMS: ReadonlyArray<readonly [PanelTab, string]> = [
  ['chat', 'Chat'],
  ['brain', 'Brain'],
  ['missions', 'Missions'],
  ['sessions', 'Sessions'],
]

const TAB_LABELS: Record<PanelTab, string> = {
  chat: 'Chat',
  brain: 'Brain',
  missions: 'Missions',
  sessions: 'Sessions',
}

function isSameCapture(a: PageCapture | null, b: PageCapture | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.url === b.url &&
    a.title === b.title &&
    a.description === b.description &&
    a.selectionText === b.selectionText &&
    a.articleTitle === b.articleTitle &&
    a.articleText === b.articleText
  )
}

export function SidepanelApp() {
  const [tab, setTab] = useState<PanelTab>('chat')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [session, setSession] = useState<boolean | null>(null)
  const [scopes, setScopes] = useState<BrainScopeOption[]>([])
  const [scopeIdx, setScopeIdx] = useState(0)
  const [capture, setCapture] = useState<PageCapture | null>(null)
  const [mode, setMode] = useState<Mode>('article')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [consentAt, setConsentAt] = useState<string | null | undefined>(undefined)
  const [consentDismissed, setConsentDismissed] = useState(false)

  const refreshCapture = useCallback(async () => {
    if (!session) return
    try {
      const cap = await sendExtensionMessage<{ payload?: PageCapture | null }>({ type: 'GET_CAPTURE' })
      const next = cap.payload ?? null
      setCapture((prev) => (isSameCapture(prev, next) ? prev : next))
    } catch {
      /* ignore capture refresh failures */
    }
  }, [session])

  const load = useCallback(async () => {
    setErr(null)
    const s = await sendExtensionMessage<{ authenticated?: boolean }>({ type: 'GET_SESSION' })
    setSession(!!s.authenticated)
    if (!s.authenticated) return
    const sc = await sendExtensionMessage<{ scopes?: BrainScopeOption[]; error?: string }>({
      type: 'GET_SCOPES',
    })
    if (sc.error) setErr(sc.error)
    setScopes(sc.scopes ?? [])
    await refreshCapture()
    const orgRes = await sendExtensionMessage<{ ok: boolean; memberships?: OrgMembership[] }>({
      type: 'GET_MY_ORGS',
    })
    if (orgRes.ok) setOrgs(orgRes.memberships ?? [])
    const stored = await chrome.storage.local.get('vibey_active_org_id')
    const savedOrgId = typeof stored.vibey_active_org_id === 'string' ? stored.vibey_active_org_id : null
    setActiveOrgId(savedOrgId)
    const consentRes = await sendExtensionMessage<{
      ok: boolean
      consent_at?: string | null
    }>({ type: 'CHECK_CONSENT_STATUS' })
    setConsentAt(consentRes.ok ? (consentRes.consent_at ?? null) : null)
  }, [refreshCapture])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onFocus = () => void load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  useEffect(() => {
    const shouldLiveRefresh =
      session === true && tab === 'brain' && mode === 'selection' && (consentAt !== null || consentDismissed)
    if (!shouldLiveRefresh) return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await refreshCapture()
    }
    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, 350)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [session, tab, mode, consentAt, consentDismissed, refreshCapture])

  useEffect(() => {
    const scope = scopes[scopeIdx]
    if (scope) void sendExtensionMessage({ type: 'SET_LAST_SCOPE', scope })
  }, [scopes, scopeIdx])

  const switchAccount = (orgId: string | null) => {
    setActiveOrgId(orgId)
    if (orgId) void chrome.storage.local.set({ vibey_active_org_id: orgId })
    else void chrome.storage.local.remove('vibey_active_org_id')
    void load()
  }

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const sendBrain = async () => {
    const scope = scopes[scopeIdx]
    if (!scope || !capture) return
    setBusy(true)
    setErr(null)
    const res = await sendExtensionMessage<{ ok: boolean; error?: string }>({
      type: 'SEND_CAPTURE',
      scope,
      capture,
      mode,
    })
    setBusy(false)
    if (!res.ok) {
      setErr((res as { error?: string }).error ?? 'Send failed')
      return
    }
    const hist = await chrome.storage.local.get('vibey_send_history')
    const list: HistoryEntry[] = Array.isArray(hist.vibey_send_history) ? hist.vibey_send_history : []
    list.unshift({
      at: new Date().toISOString(),
      title: capture.title,
      url: capture.url,
      scope: scope.label,
      mode,
    })
    await chrome.storage.local.set({ vibey_send_history: list.slice(0, 30) })
  }

  const scope = scopes[scopeIdx]
  const openLogin = () => void sendExtensionMessage({ type: 'OPEN_APP_LOGIN' })
  const showOnboarding = session === true && consentAt === null && !consentDismissed
  const headerTitle = showOnboarding ? 'Setup' : TAB_LABELS[tab]

  return (
    <div className="ext-root surface-bg">
      <header className="ext-header">
        <div className="ext-header-row">
          <div className="ext-header-side">
            {showOnboarding ? (
              <span className="ext-header-label">Setup</span>
            ) : tab === 'chat' ? (
              <div id="ext-header-left-actions" className="flex items-center min-w-0" />
            ) : (
              <span className="ext-header-label">{headerTitle}</span>
            )}
          </div>
          <div className="ext-header-side ext-header-side--right">
            <div
              className="ext-header-actions-slot"
              id="ext-chat-header-actions"
            />
            {!showOnboarding && (
              <div className="ext-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="btn-icon-inline"
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="z-dropdown mt-spacing-1 absolute right-0 top-full">
                    <div
                      className="dropdown-menu-solid ext-menu-panel p-spacing-2 gap-spacing-1 flex flex-col"
                      role="menu"
                      aria-label="Main"
                    >
                      {NAV_ITEMS.map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="menuitem"
                          className={`dropdown-menu-item ${tab === id ? 'dropdown-sort-option-selected' : ''}`}
                          onClick={() => {
                            setTab(id)
                            setMenuOpen(false)
                          }}
                        >
                          <span className="ext-dropdown-option-text">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="ext-body">
        {session === false && (
          <div className="ext-stack">
            <div className="ext-muted-box body-3">
              Sign in to Vibey at <strong className="body-2-medium">{getAppOrigin()}</strong> in this browser profile.
            </div>
            <button type="button" className="button-glass-accent w-full" onClick={openLogin}>
              Open login
            </button>
          </div>
        )}

        {session === null && <VibeyOrbLoader text="Checking session…" />}

        {session && consentAt === null && !consentDismissed && (
          <ConsentOnboarding
            onConsented={() => {
              setConsentAt(new Date().toISOString())
            }}
            onDismiss={() => setConsentDismissed(true)}
          />
        )}

        {session && (consentAt !== null || consentDismissed) && (
          <>
            {tab === 'brain' && (
              <BrainCaptureTab
                scopes={scopes}
                scopeIdx={scopeIdx}
                setScopeIdx={setScopeIdx}
                capture={capture}
                mode={mode}
                setMode={setMode}
                orgs={orgs}
                activeOrgId={activeOrgId}
                onSwitchAccount={switchAccount}
                busy={busy}
                err={err}
                onSend={() => void sendBrain()}
              />
            )}
            {tab === 'chat' && <ChatTab session={!!session} capture={capture} scope={scope} />}
            {tab === 'missions' && <MissionsTab session={!!session} />}
            {tab === 'sessions' && (
              <SessionsTab
                orgs={orgs}
                activeOrgId={activeOrgId}
                onSwitchAccount={switchAccount}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
