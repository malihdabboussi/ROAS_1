'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Search } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { adminGet, adminPatch } from '@/lib/api/admin-client'
import { formatAgentKeyDisplay } from '@/lib/format-agent-key-display'

type AppError = {
  id: string
  created_at: string
  app: string | null
  environment: string | null
  severity: string | null
  feature: string | null
  error_code: string | null
  message: string | null
  context: Record<string, unknown> | null
  user_id: string | null
  user_display_name?: string | null
  resolved: boolean | null
  category: string | null
  agent_key: string | null
}

type ErrorsData = { errors: AppError[] }

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'badge-glass badge-glass-red',
  error: 'badge-glass badge-glass-orange',
  warn: 'badge-glass badge-glass-yellow',
}

const CATEGORY_BADGE: Record<string, string> = {
  rbac: 'badge-glass badge-glass-red',
  infra: 'badge-glass badge-glass-orange',
  llm: 'badge-glass badge-glass-yellow',
  auth: 'badge-glass badge-glass-red',
  integration: 'badge-glass badge-glass-yellow',
  billing: 'badge-glass badge-glass-orange',
  ui: 'badge-glass badge-glass-muted',
  tool: 'badge-glass badge-glass-muted',
  http: 'badge-glass badge-glass-muted',
  worker: 'badge-glass badge-glass-orange',
}

/** Apps that report into app_errors even when no rows are in the current window. */
const KNOWN_APP_FILTERS = ['agent-api', 'api', 'mission-worker', 'queue-worker', 'web'] as const

/** Categories used by workers and other services before first matching row appears. */
const KNOWN_CATEGORY_FILTERS = ['worker', 'ui'] as const

/** Features worth surfacing in filters (merged with values from loaded rows). */
const KNOWN_FEATURE_FILTERS = [
  'social_research',
  'spaces/social_research',
  'spaces/social_research/topic_search',
  'spaces/automation_reconciler',
  'spaces/automation_scheduler',
  'integrations/scrapecreators',
  'integrations/fathom',
  'integrations/searchapi',
  'integrations/meta',
  'integrations/github',
  'integrations/stripe',
  'brain/import_jobs',
  'agent_improvement_proposals/jobs',
  'media',
  'brain',
  'studio_chat',
  'team_chat',
  'mission_proxy',
  'missions.processor',
  'mission',
  'broadcast-emails/processor',
  'single-emails/processor',
  'social-posts/processor',
  'crm-sync/processor',
  'ghl-email/send',
] as const

function mergeFilterOptions(known: readonly string[], fromData: string[]): string[] {
  return Array.from(new Set([...known, ...fromData])).sort((a, b) => a.localeCompare(b))
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="body-4 text-muted-foreground">—</span>
  const cls = CATEGORY_BADGE[category] ?? 'badge-glass badge-glass-muted'
  return <span className={`${cls} typo-caption font-medium`}>{category.toUpperCase()}</span>
}

const TIME_RANGES = [
  { id: '30m', label: '30 minutes', ms: 30 * 60 * 1000 },
  { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { id: '3h', label: '3 hours', ms: 3 * 60 * 60 * 1000 },
  { id: '12h', label: '12 hours', ms: 12 * 60 * 60 * 1000 },
  { id: 'all', label: 'All time', ms: 0 },
]

function SeverityBadge({ severity }: { severity: string | null }) {
  const s = severity ?? 'error'
  const cls = SEVERITY_BADGE[s] ?? 'badge-glass badge-glass-muted'
  return <span className={`${cls} typo-caption font-medium`}>{s.toUpperCase()}</span>
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedLabel = options.find((o) => o.id === value)?.label ?? label

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="surface-card border-border text-foreground body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle flex items-center border transition-all"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="mt-spacing-1 absolute left-0 top-full z-50" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-2 min-w-40">
            <div className="space-y-spacing-1">
              {options.map((option) => {
                const isSelected = value === option.id
                return (
                  <button
                    key={option.id}
                    className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                    }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm text-primary" />
                    ) : (
                      <div className="icon-sm" />
                    )}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ErrorsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const userNameFilter = useMemo(() => searchParams.get('user_name')?.trim() ?? '', [searchParams])
  const [userNameInput, setUserNameInput] = useState(userNameFilter)

  const [data, setData] = useState<ErrorsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterApp, setFilterApp] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterFeature, setFilterFeature] = useState<string>('all')
  const [filterResolved, setFilterResolved] = useState<string>('open')
  const [filterTime, setFilterTime] = useState<string>('all')
  const [resolving, setResolving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const replaceUserNameQuery = useCallback(
    (nextName: string | null) => {
      const p = new URLSearchParams()
      if (nextName && nextName.trim()) p.set('user_name', nextName.trim())
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams()
      if (userNameFilter) qs.set('user_name', userNameFilter)
      const path = qs.toString() ? `errors?${qs.toString()}` : 'errors'
      const result = await adminGet<ErrorsData>(path)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors')
    }
  }, [userNameFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setUserNameInput(userNameFilter)
  }, [userNameFilter])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = userNameInput.trim()
      if (trimmed === userNameFilter) return
      replaceUserNameQuery(trimmed.length > 0 ? trimmed : null)
    }, 350)
    return () => window.clearTimeout(t)
  }, [userNameInput, userNameFilter, replaceUserNameQuery])

  const handleResolve = async (id: string) => {
    setResolving(id)
    try {
      await adminPatch(`errors/${id}/resolve`, {})
      setData((prev) => {
        if (!prev) return prev
        return {
          errors: prev.errors.map((e) => (e.id === id ? { ...e, resolved: true } : e)),
        }
      })
    } catch {
      // silently fail
    } finally {
      setResolving(null)
    }
  }

  if (error) {
    return (
      <section className="p-spacing-6">
        <h1 className="title-h2 text-foreground mb-spacing-2">ERRORS</h1>
        <p className="body-3 text-destructive">{error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="p-spacing-6">
        <h1 className="title-h2 text-foreground mb-spacing-6">ERRORS</h1>
        <div className="py-spacing-12 flex min-h-[200px] items-center justify-center">
          <VibeyLoadingOrb text="Loading..." state="processing" size="md" />
        </div>
      </section>
    )
  }

  const apps = mergeFilterOptions(
    KNOWN_APP_FILTERS,
    data.errors.map((e) => e.app).filter(Boolean) as string[],
  )
  const severities = Array.from(
    new Set(data.errors.map((e) => e.severity).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b))
  const categories = mergeFilterOptions(
    KNOWN_CATEGORY_FILTERS,
    data.errors.map((e) => e.category).filter(Boolean) as string[],
  )
  const features = mergeFilterOptions(
    KNOWN_FEATURE_FILTERS,
    data.errors.map((e) => e.feature).filter(Boolean) as string[],
  )

  const timeRangeMs = TIME_RANGES.find((t) => t.id === filterTime)?.ms ?? 0
  const timeThreshold = timeRangeMs > 0 ? Date.now() - timeRangeMs : 0

  const filtered = data.errors.filter((e) => {
    if (filterApp !== 'all' && e.app !== filterApp) return false
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false
    if (filterCategory !== 'all' && e.category !== filterCategory) return false
    if (filterFeature !== 'all' && e.feature !== filterFeature) return false
    if (filterResolved === 'open' && e.resolved) return false
    if (filterResolved === 'resolved' && !e.resolved) return false
    if (timeThreshold > 0 && new Date(e.created_at).getTime() < timeThreshold) return false
    return true
  })

  const handleCopyAll = () => {
    const lines = filtered.map((e) => {
      const ts = new Date(e.created_at).toISOString()
      const parts = [
        `[${ts}]`,
        `[${(e.severity ?? 'error').toUpperCase()}]`,
        e.agent_key ? `[${e.agent_key}]` : null,
        `[${e.app ?? 'unknown'}]`,
        e.feature ? `[${e.feature}]` : null,
        e.error_code ? `${e.error_code}:` : null,
        e.message ?? 'no message',
      ].filter(Boolean)
      let line = parts.join(' ')
      if (e.context && Object.keys(e.context).length > 0) {
        line += `\n  context: ${JSON.stringify(e.context)}`
      }
      return line
    })
    void navigator.clipboard.writeText(lines.join('\n\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="p-spacing-6">
      <div className="mb-spacing-6">
        <h1 className="title-h2 text-foreground">ERRORS</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Application errors from agent-api and other services.
        </p>
      </div>

      <div className="mb-spacing-4 gap-spacing-3 flex flex-wrap items-center">
        <FilterDropdown
          label="Time"
          value={filterTime}
          options={TIME_RANGES.map((t) => ({ id: t.id, label: t.label }))}
          onChange={setFilterTime}
        />

        <FilterDropdown
          label="All Apps"
          value={filterApp}
          options={[{ id: 'all', label: 'All Apps' }, ...apps.map((a) => ({ id: a, label: a }))]}
          onChange={setFilterApp}
        />

        <FilterDropdown
          label="All Severities"
          value={filterSeverity}
          options={[
            { id: 'all', label: 'All Severities' },
            ...severities.map((s) => ({ id: s, label: s })),
          ]}
          onChange={setFilterSeverity}
        />

        <FilterDropdown
          label="All Categories"
          value={filterCategory}
          options={[
            { id: 'all', label: 'All Categories' },
            ...categories.map((c) => ({ id: c, label: c.toUpperCase() })),
          ]}
          onChange={setFilterCategory}
        />

        <FilterDropdown
          label="All Features"
          value={filterFeature}
          options={[
            { id: 'all', label: 'All Features' },
            ...features.map((f) => ({ id: f, label: f })),
          ]}
          onChange={setFilterFeature}
        />

        <FilterDropdown
          label="Status"
          value={filterResolved}
          options={[
            { id: 'all', label: 'All' },
            { id: 'open', label: 'Open' },
            { id: 'resolved', label: 'Resolved' },
          ]}
          onChange={setFilterResolved}
        />

        <div className="relative w-52 min-w-[13rem]">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
          <input
            type="search"
            placeholder="Search user name…"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            className="input-glass input-leading body-3 h-spacing-10 pl-spacing-8 text-foreground placeholder:text-muted-foreground w-full"
            aria-label="Search errors by user name"
          />
        </div>

        <span className="body-4 text-muted-foreground flex items-center">
          {filtered.length} error{filtered.length !== 1 ? 's' : ''}
        </span>

        <div className="ml-auto">
          <button
            onClick={handleCopyAll}
            disabled={filtered.length === 0}
            className="button-glass-neutral gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle hover:text-foreground flex items-center font-medium transition-all disabled:opacity-40"
          >
            {copied ? <Check className="icon-sm text-green-500" /> : <Copy className="icon-sm" />}
            <span>{copied ? 'Copied' : 'Copy all visible'}</span>
          </button>
        </div>
      </div>

      <div className="section-card rounded-spacing-3 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-border bg-muted/30 border-b">
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Time
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Severity
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Category
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                User
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Agent
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                App
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Feature
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Code
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Message
              </th>
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-24 text-left font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-spacing-3 py-spacing-6 body-3 text-muted-foreground text-center"
                >
                  No errors found.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <ErrorRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                onResolve={() => void handleResolve(row.id)}
                resolving={resolving === row.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ErrorRow({
  row,
  expanded,
  onToggle,
  onResolve,
  resolving,
}: {
  row: AppError
  expanded: boolean
  onToggle: () => void
  onResolve: () => void
  resolving: boolean
}) {
  const [idCopied, setIdCopied] = useState(false)

  const copyErrorId = () => {
    void navigator.clipboard.writeText(row.id).then(() => {
      setIdCopied(true)
      window.setTimeout(() => setIdCopied(false), 2000)
    })
  }

  return (
    <>
      <tr
        className="border-border hover:bg-hover-subtle cursor-pointer border-t transition-colors"
        onClick={onToggle}
      >
        <td className="px-spacing-3 py-spacing-2 body-3 text-muted-foreground whitespace-nowrap">
          {timeAgo(row.created_at)}
        </td>
        <td className="px-spacing-3 py-spacing-2">
          <SeverityBadge severity={row.severity} />
        </td>
        <td className="px-spacing-3 py-spacing-2">
          <CategoryBadge category={row.category} />
        </td>
        <td className="px-spacing-3 py-spacing-2 body-3 text-foreground max-w-[10rem] truncate text-xs">
          {row.user_display_name?.trim() ? row.user_display_name : '—'}
        </td>
        <td className="px-spacing-3 py-spacing-2 body-3 text-foreground whitespace-nowrap">
          {formatAgentKeyDisplay(row.agent_key)}
        </td>
        <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{row.app ?? '—'}</td>
        <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{row.feature ?? '—'}</td>
        <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground font-mono">
          {row.error_code ?? '—'}
        </td>
        <td className="px-spacing-3 py-spacing-2 body-3 text-foreground max-w-[400px] truncate">
          {row.message ?? '—'}
        </td>
        <td className="px-spacing-3 py-spacing-2">
          <div className="gap-spacing-2 flex flex-col items-start">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                copyErrorId()
              }}
              className="button-glass-neutral body-4 gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 hover:bg-hover-subtle text-foreground flex items-center font-medium transition-colors"
            >
              {idCopied ? (
                <Check className="icon-sm text-emerald-500" aria-hidden />
              ) : (
                <Copy className="icon-sm" aria-hidden />
              )}
              {idCopied ? 'Copied' : 'Copy ID'}
            </button>
            {!row.resolved ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onResolve()
                }}
                disabled={resolving}
                className="body-4 text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
              >
                {resolving ? 'Resolving...' : 'Resolve'}
              </button>
            ) : (
              <span className="badge-glass badge-glass-green typo-caption font-medium">Resolved</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-border border-t">
          <td colSpan={10} className="px-spacing-4 py-spacing-3 bg-muted/10">
            <div className="space-y-spacing-2">
              <div className="body-4 text-muted-foreground gap-spacing-2 flex flex-wrap items-center">
                <span className="font-medium">Error ID:</span>
                <code className="body-4 bg-muted/50 rounded-spacing-1 px-spacing-2 py-spacing-1 font-mono text-xs">
                  {row.id}
                </code>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyErrorId()
                  }}
                  className="button-glass-neutral body-4 gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 hover:bg-hover-subtle text-foreground inline-flex items-center font-medium transition-colors"
                >
                  {idCopied ? (
                    <Check className="icon-sm text-emerald-500" aria-hidden />
                  ) : (
                    <Copy className="icon-sm" aria-hidden />
                  )}
                  {idCopied ? 'Copied' : 'Copy ID'}
                </button>
              </div>
              <div className="body-4 text-muted-foreground">
                <span className="font-medium">Full timestamp:</span>{' '}
                {new Date(row.created_at).toLocaleString()}
              </div>
              {row.user_display_name?.trim() ? (
                <div className="body-4 text-muted-foreground">
                  <span className="font-medium">User:</span> {row.user_display_name}
                </div>
              ) : null}
              {row.user_id && (
                <div className="body-4 text-muted-foreground">
                  <span className="font-medium">User ID:</span> {row.user_id}
                </div>
              )}
              {row.message && (
                <div className="body-4 text-foreground">
                  <span className="text-muted-foreground font-medium">Message:</span> {row.message}
                </div>
              )}
              {row.context && Object.keys(row.context).length > 0 && (
                <div>
                  <span className="body-4 text-muted-foreground font-medium">Context:</span>
                  <pre className="surface-card border-border mt-spacing-1 rounded-spacing-2 p-spacing-3 text-foreground overflow-x-auto border text-xs">
                    {JSON.stringify(row.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
