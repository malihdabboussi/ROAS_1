import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import type { BrainScopeOption, OrgMembership, PageCapture } from '../../shared/types'
import { positionFloatingMenuFromAnchorRect } from '../../chat/floating-menu-anchor'
import { Tooltip } from '../../ui/Tooltip'

type Mode = 'url' | 'selection' | 'article'

const CAPTURE_MODE_OPTIONS: Array<{ key: Mode; label: string; icon: ReactNode }> = [
  {
    key: 'url',
    label: 'Link',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
      </svg>
    ),
  },
  {
    key: 'selection',
    label: 'Selection',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7V5a2 2 0 0 1 2-2h2" />
        <path d="M16 3h2a2 2 0 0 1 2 2v2" />
        <path d="M20 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 21H6a2 2 0 0 1-2-2v-2" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="13" y2="14" />
      </svg>
    ),
  },
  {
    key: 'article',
    label: 'Article',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="14" y2="17" />
      </svg>
    ),
  },
]

type ChipOption = { value: string; label: string }

function ChipDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string
  options: ChipOption[]
  onChange: (v: string) => void
  ariaLabel: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? placeholder ?? 'Select'

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const measured = menuRef.current?.offsetHeight
    const menuHeight = Math.min(Math.max(measured && measured > 0 ? measured : 0, 120), 320)
    setPos(
      positionFloatingMenuFromAnchorRect(rect, {
        menuWidth: 240,
        menuHeight,
        gap: 8,
        viewportMargin: 8,
      }),
    )
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    const reposition = () => updatePos()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="chip-glass-neutral flex h-8 max-w-full items-center gap-1 rounded-full px-spacing-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="typo-caption font-medium text-truncate">{label}</span>
        <ChevronDown className="icon-3-5 shrink-0" aria-hidden="true" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            className="dropdown-menu-solid z-dropdown fixed py-spacing-1 px-spacing-2"
            style={{ top: pos.top, left: pos.left, minWidth: 220 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {options.map((opt) => {
              const isSel = opt.value === value
              return (
                <button
                  key={opt.value || '__empty__'}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  className="rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 text-muted-foreground hover-bg-studio-subtle hover-text-foreground flex w-full items-center justify-between gap-spacing-2 text-left transition-all"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <span className="text-truncate">{opt.label}</span>
                  {isSel && <Check className="icon-3-5 shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

type Props = {
  scopes: BrainScopeOption[]
  scopeIdx: number
  setScopeIdx: (i: number) => void
  capture: PageCapture | null
  mode: Mode
  setMode: (m: Mode) => void
  orgs: OrgMembership[]
  activeOrgId: string | null
  onSwitchAccount: (orgId: string | null) => void
  busy: boolean
  err: string | null
  onSend: () => void
}

function getHostname(url: string | undefined | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function BrainCaptureTab({
  scopes,
  scopeIdx,
  setScopeIdx,
  capture,
  mode,
  setMode,
  orgs,
  activeOrgId,
  onSwitchAccount,
  busy,
  err,
  onSend,
}: Props) {
  const scope = scopes[scopeIdx]

  const accountOptions: ChipOption[] = [
    { value: '', label: 'Personal' },
    ...orgs.map((m) => ({ value: m.org_id, label: m.organizations.name })),
  ]

  const brainOptions: ChipOption[] = scopes.map((b, i) => ({
    value: String(i),
    label: `${b.label} (${b.scopeType})`,
  }))

  const hostname = getHostname(capture?.url)
  const title = capture?.articleTitle || capture?.title || hostname || 'No page'
  const favicon = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64` : null

  const body =
    mode === 'url'
      ? capture?.url ?? ''
      : mode === 'selection'
        ? capture?.selectionText || ''
        : capture?.articleText || ''

  const canSend = !busy && !!scope && !!capture

  return (
    <div className="ext-stack">
      <div className="flex flex-wrap items-center gap-spacing-2">
        <ChipDropdown
          value={activeOrgId ?? ''}
          options={accountOptions}
          onChange={(v) => onSwitchAccount(v || null)}
          ariaLabel="Account"
        />
        <ChipDropdown
          value={String(scopeIdx)}
          options={brainOptions}
          onChange={(v) => setScopeIdx(Number(v))}
          ariaLabel="Target brain"
          placeholder="No brains"
        />
      </div>

      <div className="input-glass ext-brain-surface relative flex flex-col overflow-hidden p-spacing-3 gap-spacing-3">
        {capture ? (
          <>
            <div className="flex items-center gap-spacing-2 min-w-0">
              {favicon ? (
                <img
                  src={favicon}
                  width={16}
                  height={16}
                  alt=""
                  aria-hidden="true"
                  className="ext-brain-favicon shrink-0"
                />
              ) : (
                <span className="ext-brain-favicon shrink-0" aria-hidden="true" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="body-3 font-medium text-foreground text-truncate">{title}</span>
                {hostname && (
                  <span className="body-4 text-muted-foreground text-truncate">{hostname}</span>
                )}
              </div>
            </div>
            <div className="ext-brain-preview-body body-3 text-muted-foreground">
              {body || <span className="text-muted-foreground">—</span>}
            </div>
          </>
        ) : (
          <div className="ext-brain-empty body-3 text-muted-foreground">
            Open a browser tab with content to capture.
          </div>
        )}

        <div className="flex items-center justify-between gap-spacing-2">
          <div className="flex gap-spacing-1">
            {CAPTURE_MODE_OPTIONS.map(({ key, label, icon }) => {
              const active = mode === key
              return (
                <Tooltip key={key} label={label}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={label}
                    className={`btn-icon-glass ${active ? 'btn-icon-glass--active' : ''}`}
                    onClick={() => setMode(key)}
                  >
                    {icon}
                  </button>
                </Tooltip>
              )
            })}
          </div>
          <Tooltip label="Send to brain queue">
            <button
              type="button"
              className="button-glass-accent button-glass-accent--icon"
              disabled={!canSend}
              onClick={onSend}
              aria-label="Send to brain queue"
            >
              {busy ? (
                <svg className="icon-3-5 ext-brain-spinner" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="36 18" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {err && <p className="body-4 text-destructive ext-brain-err">{err}</p>}
    </div>
  )
}
