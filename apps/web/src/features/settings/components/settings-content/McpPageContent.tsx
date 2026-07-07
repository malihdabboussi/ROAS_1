'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Cable,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  LayoutList,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

interface McpServer {
  id: string
  name: string
  description: string | null
  server_url: string
  domain: string
  agent_enabled: boolean
  enabled: boolean
  tool_count: number
  cached_tools: Array<{ name: string; description?: string }>
  last_connected_at: string | null
}

type McpDomain = 'shared' | 'marketing' | 'analyst' | 'developer'
type ViewMode = 'form' | 'json'

interface McpJsonEntry {
  name: string
  url: string
  description?: string
  domain?: McpDomain
  api_key?: string
  headers?: Record<string, string>
  enabled?: boolean
  agent_enabled?: boolean
}

const DOMAIN_OPTIONS: { value: McpDomain; label: string }[] = [
  { value: 'shared', label: 'Shared (All agents)' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'developer', label: 'Developer' },
]

function tryFixJson(raw: string): string | null {
  try {
    JSON.parse(raw)
    return null
  } catch {
    /* needs fixing */
  }

  let text = raw

  // Strip single-line comments
  text = text.replace(/^\s*\/\/.*$/gm, '')
  // Strip block comments
  text = text.replace(/\/\*[\s\S]*?\*\//g, '')

  // Single quotes → double quotes (around property names)
  text = text.replace(/'([^']*?)'\s*:/g, '"$1":')
  // Single quotes → double quotes (string values)
  text = text.replace(/:\s*'([^']*?)'/g, ': "$1"')

  // Unquoted property names → quoted
  text = text.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')

  // Trailing commas before } or ]
  text = text.replace(/,(\s*[}\]])/g, '$1')

  // Missing commas between } { or } " or ] { or ] "
  text = text.replace(/}\s*{/g, '}, {')
  text = text.replace(/}\s*"/g, '}, "')
  text = text.replace(/]\s*\[/g, '], [')

  // Balance missing closing brackets/braces
  const opens = { '{': 0, '[': 0 }
  const closes: Record<string, '{' | '['> = { '}': '{', ']': '[' }
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{' || ch === '[') opens[ch]++
    if (ch === '}' || ch === ']') opens[closes[ch]!]--
  }
  const trimmed = text.trimEnd()
  if (opens['{'] > 0) text = trimmed + '\n' + '}'.repeat(opens['{'])
  if (opens['['] > 0) text = (opens['{'] > 0 ? text : trimmed) + '\n' + ']'.repeat(opens['['])

  // After auto-closing braces, run trailing-comma cleanup again
  text = text.replace(/,(\s*[}\]])/g, '$1')

  // Multiple attempts: try as-is, then try wrapping in array
  for (const attempt of [text, `[${text}]`]) {
    try {
      JSON.parse(attempt)
      return attempt
    } catch {
      /* try next */
    }
  }

  return null
}

function normalizeMcpApiKey(value: string): string {
  return value
    .trim()
    .replace(/^Authorization\s*:\s*/i, '')
    .replace(/^(Bearer\s+)+/i, '')
    .trim()
}

function extractAuthorizationHeaderValue(headers: unknown): string | undefined {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return undefined
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() !== 'authorization') continue
    if (typeof value === 'string' && value.trim().length > 0) return normalizeMcpApiKey(value)
  }
  return undefined
}

function serversToJson(servers: McpServer[]): Record<string, unknown> {
  const mcpServers: Record<string, Record<string, unknown>> = {}
  for (const s of servers) {
    mcpServers[s.name] = {
      url: s.server_url,
      ...(s.description ? { description: s.description } : {}),
      domain: s.domain,
      enabled: s.enabled,
      agent_enabled: s.agent_enabled,
    }
  }
  return { mcpServers }
}

function normalizeMcpJsonInput(parsed: unknown): McpJsonEntry[] {
  // Format A: [{ name, url, ... }]
  if (Array.isArray(parsed)) {
    return parsed.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error(`Entry ${index + 1}: must be an object { }`)
      }
      const row = entry as Record<string, unknown>
      return {
        name: String(row.name ?? '').trim(),
        url: String(row.url ?? '').trim(),
        ...(typeof row.description === 'string' ? { description: row.description } : {}),
        ...(typeof row.domain === 'string' ? { domain: row.domain as McpDomain } : {}),
        ...(typeof row.api_key === 'string' ? { api_key: normalizeMcpApiKey(row.api_key) } : {}),
        ...(row.headers && typeof row.headers === 'object' && !Array.isArray(row.headers)
          ? { headers: row.headers as Record<string, string> }
          : {}),
        ...(typeof row.enabled === 'boolean' ? { enabled: row.enabled } : {}),
        ...(typeof row.agent_enabled === 'boolean' ? { agent_enabled: row.agent_enabled } : {}),
      }
    })
  }

  // Format B: { mcpServers: { serverName: { url, headers, ... } } }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const root = parsed as Record<string, unknown>
    const mcpServers = root.mcpServers
    if (!mcpServers || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) {
      throw new Error('Root must be either an array [ ] or an object with "mcpServers" map')
    }
    const entries: McpJsonEntry[] = []
    for (const [name, value] of Object.entries(mcpServers as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Server "${name}" must be an object`)
      }
      const row = value as Record<string, unknown>
      const headers =
        row.headers && typeof row.headers === 'object' && !Array.isArray(row.headers)
          ? (row.headers as Record<string, string>)
          : undefined
      const apiKey =
        typeof row.api_key === 'string'
          ? normalizeMcpApiKey(row.api_key)
          : extractAuthorizationHeaderValue(headers)

      entries.push({
        name: String(name).trim(),
        url: String(row.url ?? row.server_url ?? '').trim(),
        ...(typeof row.description === 'string' ? { description: row.description } : {}),
        ...(typeof row.domain === 'string' ? { domain: row.domain as McpDomain } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(headers ? { headers } : {}),
        ...(typeof row.enabled === 'boolean' ? { enabled: row.enabled } : {}),
        ...(typeof row.agent_enabled === 'boolean' ? { agent_enabled: row.agent_enabled } : {}),
      })
    }
    return entries
  }

  throw new Error('Root must be either an array [ ] or an object with "mcpServers" map')
}

function DomainDropdown({
  value,
  onChange,
  size = 'md',
}: {
  value: string
  onChange: (v: McpDomain) => void
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const label = DOMAIN_OPTIONS.find((o) => o.value === value)?.label ?? value
  const isSm = size === 'sm'

  return (
    <div ref={ref} className="relative min-w-0 max-w-full" data-dropdown>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`border-border surface-bg text-foreground gap-spacing-1 rounded-spacing-2 flex min-w-0 max-w-full items-center border ${isSm ? 'body-4 px-spacing-2 h-7' : 'body-3 px-spacing-3 h-9'}`}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={`text-muted-foreground shrink-0 ${isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
        />
      </button>
      {open && (
        <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
          <div className="surface-card border-border rounded-spacing-2 p-spacing-2 min-w-44 border shadow-lg">
            <div className="space-y-spacing-1">
              {DOMAIN_OPTIONS.map((opt) => {
                const isSelected = value === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm text-primary" />
                    ) : (
                      <div className="icon-sm" />
                    )}
                    <span>{opt.label}</span>
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

export default function McpPageContent() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    url: '',
    description: '',
    domain: 'shared' as McpDomain,
    apiKey: '',
  })
  const [adding, setAdding] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('form')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [jsonSaving, setJsonSaving] = useState(false)
  const [jsonValid, setJsonValid] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const showJsonFix = !!jsonError

  const fetchServers = useCallback(async () => {
    try {
      const result = await backendGet<{ success: boolean; servers: McpServer[] }>(
        '/api/mcp/servers',
      )
      if (result?.success) {
        setServers(result.servers ?? [])
        setJsonText(JSON.stringify(serversToJson(result.servers ?? []), null, 2))
      }
    } catch {
      toast.error('Failed to load MCP servers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServers()
  }, [fetchServers])

  const validateJson = useCallback((text: string): string | null => {
    if (!text.trim()) return 'JSON is empty'
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      const msg = err instanceof SyntaxError ? err.message : 'Invalid JSON syntax'
      const match = msg.match(/position (\d+)/)
      if (match) {
        const pos = Number(match[1])
        const line = text.slice(0, pos).split('\n').length
        return `Syntax error at line ${line}: ${msg}`
      }
      return msg
    }
    let entries: McpJsonEntry[]
    try {
      entries = normalizeMcpJsonInput(parsed)
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid MCP JSON structure'
    }

    const validDomains = new Set(['shared', 'marketing', 'analyst', 'developer'])
    const names = new Set<string>()
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] as unknown as Record<string, unknown>
      if (!entry.name || typeof entry.name !== 'string' || !entry.name.trim()) {
        return `Entry ${i + 1}: "name" is required and must be a non-empty string`
      }
      if (names.has(entry.name as string)) {
        return `Entry ${i + 1}: duplicate name "${entry.name}"`
      }
      names.add(entry.name as string)
      if (!entry.url || typeof entry.url !== 'string' || !entry.url.trim()) {
        return `Entry ${i + 1} ("${entry.name}"): "url" is required and must be a non-empty string`
      }
      try {
        new URL(entry.url as string)
      } catch {
        return `Entry ${i + 1} ("${entry.name}"): "url" is not a valid URL`
      }
      if (entry.domain !== undefined && !validDomains.has(entry.domain as string)) {
        return `Entry ${i + 1} ("${entry.name}"): "domain" must be one of: shared, marketing, analyst, developer`
      }
      if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
        return `Entry ${i + 1} ("${entry.name}"): "enabled" must be true or false`
      }
      if (entry.agent_enabled !== undefined && typeof entry.agent_enabled !== 'boolean') {
        return `Entry ${i + 1} ("${entry.name}"): "agent_enabled" must be true or false`
      }
    }
    return null
  }, [])

  useEffect(() => {
    if (viewMode === 'json') {
      const text = JSON.stringify(serversToJson(servers), null, 2)
      setJsonText(text)
      setJsonError(null)
      setJsonValid(true)
    }
  }, [viewMode, servers])

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      toast.error('Name and URL are required')
      return
    }
    setAdding(true)
    try {
      const result = await backendPost<{ success: boolean; server?: McpServer; error?: string }>(
        '/api/mcp/servers',
        {
          name: addForm.name.trim(),
          url: addForm.url.trim(),
          description: addForm.description.trim() || undefined,
          domain: addForm.domain,
          api_key: normalizeMcpApiKey(addForm.apiKey) || undefined,
        },
      )
      if (!result?.success) {
        toast.error(result?.error ?? 'Failed to add server')
        return
      }
      toast.success('MCP server added')
      setShowAdd(false)
      setAddForm({ name: '', url: '', description: '', domain: 'shared', apiKey: '' })
      await fetchServers()
    } catch {
      toast.error('Failed to add MCP server')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (serverId: string) => {
    try {
      await backendDelete(`/api/mcp/servers/${serverId}`)
      setServers((prev) => prev.filter((s) => s.id !== serverId))
      toast.success('MCP server removed')
    } catch {
      toast.error('Failed to remove server')
    }
  }

  const handleToggleEnabled = async (serverId: string, enabled: boolean) => {
    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, enabled } : s)))
    try {
      await backendPatch(`/api/mcp/servers/${serverId}`, { enabled })
    } catch {
      setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, enabled: !enabled } : s)))
      toast.error('Failed to update server')
    }
  }

  const handleDomainChange = async (serverId: string, domain: string) => {
    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, domain } : s)))
    try {
      await backendPatch(`/api/mcp/servers/${serverId}`, { domain })
    } catch {
      toast.error('Failed to update domain')
      await fetchServers()
    }
  }

  const handleJsonSave = async () => {
    let parsed: unknown
    let entries: McpJsonEntry[]
    try {
      parsed = JSON.parse(jsonText)
      entries = normalizeMcpJsonInput(parsed)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }

    setJsonError(null)
    setJsonSaving(true)

    try {
      const existingByName = new Map(servers.map((s) => [s.name, s]))
      const jsonNames = new Set(entries.map((e) => e.name))
      const errors: string[] = []

      for (const server of servers) {
        if (!jsonNames.has(server.name)) {
          await backendDelete(`/api/mcp/servers/${server.id}`)
        }
      }

      for (const entry of entries) {
        const existing = existingByName.get(entry.name)
        if (existing) {
          const updates: Record<string, unknown> = {}
          if (entry.domain && entry.domain !== existing.domain) updates.domain = entry.domain
          if (typeof entry.enabled === 'boolean' && entry.enabled !== existing.enabled)
            updates.enabled = entry.enabled
          if (
            typeof entry.agent_enabled === 'boolean' &&
            entry.agent_enabled !== existing.agent_enabled
          )
            updates.agent_enabled = entry.agent_enabled
          if (entry.description !== undefined && entry.description !== existing.description)
            updates.description = entry.description
          if (Object.keys(updates).length > 0) {
            await backendPatch(`/api/mcp/servers/${existing.id}`, updates)
          }
        } else {
          const addResult = await backendPost<{ success: boolean; error?: string }>(
            '/api/mcp/servers',
            {
              name: entry.name,
              url: entry.url,
              description: entry.description,
              domain: entry.domain ?? 'shared',
              api_key: entry.api_key,
            },
          )
          if (!addResult?.success) {
            errors.push(`"${entry.name}": ${addResult?.error ?? 'Unknown error'}`)
          }
        }
      }

      if (errors.length > 0) {
        toast.error(`Failed to add: ${errors.join('; ')}`)
      } else {
        toast.success('MCP config saved from JSON')
      }
      await fetchServers()
    } catch {
      toast.error('Failed to save JSON config')
    } finally {
      setJsonSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="space-y-spacing-4 p-spacing-4 mx-auto max-w-3xl sm:space-y-6 sm:p-6">
      <div className="gap-spacing-3 flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="title-h5 text-foreground uppercase">MCP SERVERS</h1>
          <p className="body-3 text-muted-foreground mt-1">
            Connect external MCP servers so your agents can discover and use their tools.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="chip-glass-blue flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium max-md:w-full md:w-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="md:hidden">Add</span>
          <span className="hidden md:inline">Add Server</span>
        </button>
      </div>

      <div className="chip-glass-neutral flex h-8 w-fit max-w-full items-center rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => setViewMode('form')}
          className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-all ${viewMode === 'form' ? 'bg-hover-subtle text-foreground' : 'text-muted-foreground'}`}
        >
          <LayoutList className="h-3 w-3" />
          Form
        </button>
        <button
          type="button"
          onClick={() => setViewMode('json')}
          className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-all ${viewMode === 'json' ? 'bg-hover-subtle text-foreground' : 'text-muted-foreground'}`}
        >
          <Code2 className="h-3 w-3" />
          JSON
        </button>
      </div>

      {viewMode === 'json' ? (
        <div className="space-y-3">
          {jsonError && (
            <div className="border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-destructive)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="body-3 min-w-0 flex-1 text-[var(--color-destructive)]">{jsonError}</p>
              {showJsonFix && (
                <button
                  type="button"
                  onClick={() => {
                    const fixed = tryFixJson(jsonText)
                    if (!fixed) {
                      toast.error('Could not auto-fix this JSON. Please fix manually.')
                      return
                    }
                    const parsed = JSON.parse(fixed) as unknown
                    let normalized: unknown = parsed
                    const formatted = JSON.stringify(normalized, null, 2)
                    setJsonText(formatted)
                    const err = validateJson(formatted)
                    setJsonError(err)
                    setJsonValid(!err)
                  }}
                  className="chip-glass-neutral shrink-0 rounded-md px-2 py-0.5 text-xs font-medium transition-colors hover:text-[var(--color-foreground)]"
                >
                  Fix
                </button>
              )}
            </div>
          )}
          <div
            className={`card-glass rounded-spacing-3 overflow-hidden transition-all ${!jsonValid ? 'ring-[var(--color-destructive)]/40 ring-1' : ''}`}
          >
            <textarea
              ref={textareaRef}
              value={jsonText}
              onChange={(e) => {
                const val = e.target.value
                setJsonText(val)
                const err = validateJson(val)
                setJsonError(err)
                setJsonValid(!err)
              }}
              spellCheck={false}
              className="text-foreground body-3 w-full resize-none bg-transparent p-3 font-mono focus:outline-none sm:p-4"
              style={{ minHeight: 'min(50vh, 320px)', tabSize: 2 }}
            />
          </div>
          <div className="gap-spacing-3 flex flex-col md:flex-row md:items-center md:justify-between">
            <p className="body-4 text-muted-foreground min-w-0">
              Edit the JSON array to add, update, or remove servers. Include{' '}
              <code className="text-foreground">"api_key"</code> for new servers that need
              authentication.
            </p>
            <button
              type="button"
              onClick={() => void handleJsonSave()}
              disabled={jsonSaving || !jsonValid}
              className="chip-glass-blue h-8 shrink-0 rounded-lg px-4 text-sm font-medium disabled:opacity-50 max-md:w-full"
            >
              {jsonSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {showAdd && (
            <div className="card-glass rounded-spacing-3 space-y-4 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="body-4 text-muted-foreground font-medium">Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="my-supabase"
                    className="input-glass h-9 w-full rounded-lg px-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="body-4 text-muted-foreground font-medium">Server URL</label>
                  <input
                    type="text"
                    value={addForm.url}
                    onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://mcp.example.com"
                    className="input-glass h-9 w-full rounded-lg px-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="body-4 text-muted-foreground font-medium">Description</label>
                  <input
                    type="text"
                    value={addForm.description}
                    onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Supabase database management"
                    className="input-glass h-9 w-full rounded-lg px-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="body-4 text-muted-foreground font-medium">Domain (RBAC)</label>
                  <DomainDropdown
                    value={addForm.domain}
                    onChange={(v) => setAddForm((f) => ({ ...f, domain: v }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="body-4 text-muted-foreground font-medium">
                    API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={addForm.apiKey}
                    onChange={(e) => setAddForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder="API token or Authorization header"
                    className="input-glass h-9 w-full rounded-lg px-3 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 max-md:w-full sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="chip-glass-neutral h-8 rounded-lg px-3 text-sm font-medium max-md:w-full sm:max-w-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={adding}
                  className="chip-glass-blue h-8 rounded-lg px-3 text-sm font-medium disabled:opacity-50 max-md:w-full sm:max-w-none"
                >
                  {adding ? 'Adding...' : 'Add Server'}
                </button>
              </div>
            </div>
          )}

          {servers.length === 0 && !showAdd && (
            <div className="card-glass rounded-spacing-3 flex flex-col items-center justify-center gap-3 py-12">
              <Cable className="text-muted-foreground h-8 w-8" />
              <p className="body-2 text-muted-foreground">No MCP servers connected yet.</p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="chip-glass-blue h-8 rounded-lg px-3 text-sm font-medium"
              >
                Add your first server
              </button>
            </div>
          )}

          {servers.map((server) => {
            const isExpanded = expandedId === server.id
            return (
              <div key={server.id} className="card-glass rounded-spacing-3 overflow-hidden">
                <div className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center md:gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : server.id)}
                      className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="body-2 text-foreground font-medium">{server.name}</span>
                        <span className="chip-glass-neutral rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {server.tool_count} tool{server.tool_count !== 1 ? 's' : ''}
                        </span>
                        <span className="chip-glass-neutral rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                          {server.domain}
                        </span>
                      </div>
                      {server.description && (
                        <p className="body-4 text-muted-foreground mt-0.5">{server.description}</p>
                      )}
                      <p className="body-4 text-muted-foreground mt-0.5 break-all">
                        {server.server_url}
                      </p>
                    </div>
                  </div>

                  <div className="border-border flex flex-wrap items-center justify-end gap-2 max-md:w-full max-md:border-t max-md:pt-3 md:max-w-none md:border-none md:pt-0">
                    <DomainDropdown
                      value={server.domain}
                      onChange={(v) => void handleDomainChange(server.id, v)}
                      size="sm"
                    />

                    <Switch
                      checked={server.enabled}
                      onCheckedChange={(checked) => void handleToggleEnabled(server.id, checked)}
                    />

                    <button
                      type="button"
                      onClick={() => void handleRemove(server.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && server.cached_tools.length > 0 && (
                  <div className="border-border border-t px-3 py-3 sm:px-4">
                    <p className="body-4 text-muted-foreground mb-2 font-medium">Available Tools</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {server.cached_tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="bg-hover-subtle rounded-spacing-1 px-3 py-2"
                        >
                          <span className="body-3 text-foreground font-medium">{tool.name}</span>
                          {tool.description && (
                            <p className="body-4 text-muted-foreground mt-0.5 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
