'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronDown, RefreshCw, Wrench } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAgentKeyDisplay } from '@/lib/format-agent-key-display'
import {
  fetchInstructionAudit,
  runInstructionRepair,
  type InstructionGovernanceFilters,
} from './services/instruction-governance.service'
import type {
  InstructionAuditFinding,
  InstructionAuditResponse,
  InstructionAuditStatus,
  InstructionCustomClassification,
  InstructionRepairResponse,
} from './types'

const TAB_VALUES = ['overview', 'findings', 'policy'] as const
type TabValue = (typeof TAB_VALUES)[number]

const STATUS_BADGE: Record<InstructionAuditStatus, string> = {
  ok: 'badge-glass badge-glass-green',
  missing_contracts: 'badge-glass badge-glass-red',
  stale_contracts: 'badge-glass badge-glass-orange',
  missing_skill: 'badge-glass badge-glass-red',
}

const CLASSIFICATION_LABEL: Record<InstructionCustomClassification, string> = {
  generated_placeholder: 'Generated placeholder',
  platform_template_copy: 'Platform template copy',
  user_authored_custom: 'User-authored custom',
  org_override: 'Org override',
}

function tabFromSearchParam(raw: string | null): TabValue {
  if (raw && (TAB_VALUES as readonly string[]).includes(raw)) return raw as TabValue
  return 'overview'
}

function titleCaseKey(key: string): string {
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function sourceKindLabel(kind: InstructionAuditFinding['sourceKind']): string {
  if (kind === 'generated_vibey_api') return 'Generated'
  if (kind === 'db_agent_skill') return 'DB skill'
  return 'DB TOOLS.md'
}

function StatusBadge({ status }: { status: InstructionAuditStatus }) {
  return (
    <span className={`${STATUS_BADGE[status]} typo-caption font-medium`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  )
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

  const selectedLabel = options.find((o) => o.id === value)?.label ?? label

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        className="surface-card border-border text-foreground body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle flex items-center border transition-all"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen ? (
        <div className="mt-spacing-1 absolute left-0 top-full z-50">
          <div className="dropdown-menu-solid p-spacing-2 min-w-40">
            <div className="space-y-spacing-1">
              {options.map((option) => {
                const isSelected = value === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                    }}
                  >
                    {isSelected ? <Check className="icon-sm text-primary" /> : <div className="icon-sm" />}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FindingDetail({ finding }: { finding: InstructionAuditFinding }) {
  return (
    <div className="space-y-spacing-4">
      <p className="body-3 text-foreground">{finding.message}</p>

      {finding.missingContracts.length > 0 ? (
        <div>
          <p className="body-4 text-muted-foreground mb-spacing-2 font-medium">Missing contracts</p>
          <div className="gap-spacing-2 flex flex-wrap">
            {finding.missingContracts.map((id) => (
              <span key={id} className="badge-glass badge-glass-red typo-caption font-medium">
                {titleCaseKey(id)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {finding.staleContracts.length > 0 ? (
        <div>
          <p className="body-4 text-muted-foreground mb-spacing-2 font-medium">Stale contracts</p>
          <div className="gap-spacing-2 flex flex-wrap">
            {finding.staleContracts.map((id) => (
              <span key={id} className="badge-glass badge-glass-orange typo-caption font-medium">
                {titleCaseKey(id)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {finding.classification ? (
        <div className="gap-x-spacing-6 gap-y-spacing-2 grid grid-cols-1 sm:grid-cols-2">
          <div>
            <p className="body-4 text-muted-foreground mb-spacing-1">Classification</p>
            <p className="body-3 text-foreground">{CLASSIFICATION_LABEL[finding.classification]}</p>
          </div>
          <div>
            <p className="body-4 text-muted-foreground mb-spacing-1">Auto-repair</p>
            <p className="body-3 text-foreground">{finding.autoRepairAllowed ? 'Allowed' : 'Blocked'}</p>
          </div>
          {finding.repairPolicyReason ? (
            <div className="sm:col-span-2">
              <p className="body-4 text-muted-foreground mb-spacing-1">Policy reason</p>
              <p className="body-3 text-foreground font-mono text-xs">{finding.repairPolicyReason}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {finding.contractVersions.length > 0 ? (
        <details className="rounded-spacing-2 border-border border" open={finding.status !== 'ok'}>
          <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
            <span className="text-foreground font-medium">Protocol versions</span>
            <span className="ml-spacing-2">{finding.contractVersions.length} contracts</span>
          </summary>
          <div className="border-border border-t p-spacing-4">
            <div className="section-card max-h-[min(320px,50vh)] overflow-y-auto overscroll-contain rounded-spacing-3">
              <table className="w-full">
                <thead className="sticky top-0 z-[1] bg-muted/90">
                  <tr className="border-border border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Protocol
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
                      Expected
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
                      Rendered
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {finding.contractVersions.map((row) => (
                    <tr key={row.contractId} className="border-border border-t">
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{row.title}</td>
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground text-right tabular-nums">
                        v{row.expectedVersion}
                      </td>
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground text-right tabular-nums">
                        {row.renderedVersion != null ? `v${row.renderedVersion}` : '—'}
                      </td>
                      <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground">
                        {row.versionStatus.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}

      {finding.missingRequiredConcepts.length > 0 ? (
        <details className="rounded-spacing-2 border-border border">
          <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
            <span className="text-foreground font-medium">Missing concepts</span>
          </summary>
          <div className="border-border space-y-spacing-3 border-t p-spacing-4">
            {finding.missingRequiredConcepts.map((item) => (
              <div key={item.contractId}>
                <p className="body-4 text-muted-foreground mb-spacing-1 font-medium">
                  {titleCaseKey(item.contractId)}
                </p>
                <ul className="body-4 text-foreground list-disc pl-spacing-5">
                  {item.missingConcepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function RepairResultPanel({ result }: { result: InstructionRepairResponse }) {
  if (result.repaired.length === 0 && result.skipped.length === 0) {
    return (
      <p className="body-3 text-muted-foreground">Repair completed with no row changes.</p>
    )
  }

  return (
    <div className="space-y-spacing-4">
      {result.repaired.length > 0 ? (
        <div>
          <p className="body-4 text-muted-foreground mb-spacing-2 font-medium">
            Repaired ({result.repaired.length})
          </p>
          <div className="section-card rounded-spacing-3 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Agent
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Before
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    After
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.repaired.map((row) => (
                  <tr key={row.id} className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                      {formatAgentKeyDisplay(row.agentKey)}
                    </td>
                    <td className="px-spacing-3 py-spacing-2">
                      <StatusBadge status={row.before.status} />
                    </td>
                    <td className="px-spacing-3 py-spacing-2">
                      <StatusBadge status={row.after.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result.skipped.length > 0 ? (
        <details className="rounded-spacing-2 border-border border">
          <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
            <span className="text-foreground font-medium">Skipped ({result.skipped.length})</span>
          </summary>
          <div className="border-border border-t p-spacing-4">
            <div className="section-card max-h-[min(240px,40vh)] overflow-y-auto overscroll-contain rounded-spacing-3">
              <table className="w-full">
                <thead className="sticky top-0 z-[1] bg-muted/90">
                  <tr className="border-border border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Agent
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((row) => (
                    <tr key={`${row.id}-${row.reason}`} className="border-border border-t">
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                        {formatAgentKeyDisplay(row.agentKey)}
                      </td>
                      <td className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground font-mono text-xs">
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  )
}

export function InstructionGovernanceContainer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = useMemo(() => tabFromSearchParam(searchParams.get('tab')), [searchParams])

  const setActiveTab = useCallback(
    (next: string) => {
      const tab = tabFromSearchParam(next)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'overview') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const [loading, setLoading] = useState(true)
  const [repairing, setRepairing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<InstructionAuditResponse | null>(null)
  const [repairResult, setRepairResult] = useState<InstructionRepairResponse | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTarget, setFilterTarget] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [agentKeyFilter, setAgentKeyFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: InstructionGovernanceFilters = {}
      const trimmedAgent = agentKeyFilter.trim()
      if (trimmedAgent) filters.agent_key = trimmedAgent
      const result = await fetchInstructionAudit(filters)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit')
    } finally {
      setLoading(false)
    }
  }, [agentKeyFilter])

  useEffect(() => {
    void load()
  }, [load])

  const handleRepair = async () => {
    setRepairing(true)
    setError(null)
    try {
      const filters: InstructionGovernanceFilters = {}
      const trimmedAgent = agentKeyFilter.trim()
      if (trimmedAgent) filters.agent_key = trimmedAgent
      const result = await runInstructionRepair(filters)
      setRepairResult(result)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Repair failed')
    } finally {
      setRepairing(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-spacing-6">
        <header>
          <h1 className="title-h1 text-foreground">INSTRUCTION GOVERNANCE</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">Loading audit…</p>
        </header>
        <div className="py-spacing-12 flex min-h-[240px] items-center justify-center">
          <VibeyLoadingOrb text="Loading..." state="processing" size="md" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-spacing-6">
        <header>
          <h1 className="title-h1 text-foreground">INSTRUCTION GOVERNANCE</h1>
          <p className="body-3 text-destructive mt-spacing-2">{error}</p>
        </header>
      </div>
    )
  }

  const summary = data?.summary ?? {
    ok: 0,
    missing_contracts: 0,
    stale_contracts: 0,
    missing_skill: 0,
  }
  const findings = data?.findings ?? []
  const totalFindings = findings.length
  const issueCount =
    summary.missing_contracts + summary.stale_contracts + summary.missing_skill
  const healthOk = issueCount === 0

  const statusOptions = [
    { id: 'all', label: 'All statuses' },
    ...Object.keys(summary).map((status) => ({
      id: status,
      label: status.replace(/_/g, ' '),
    })),
  ]

  const targetOptions = [
    { id: 'all', label: 'All targets' },
    { id: 'vibey-api', label: 'vibey-api' },
    { id: 'TOOLS.md', label: 'TOOLS.md' },
  ]

  const sourceOptions = [
    { id: 'all', label: 'All sources' },
    { id: 'generated_vibey_api', label: 'Generated' },
    { id: 'db_agent_skill', label: 'DB skill' },
    { id: 'db_agent_tools', label: 'DB TOOLS.md' },
  ]

  const filteredFindings = findings.filter((finding) => {
    if (filterStatus !== 'all' && finding.status !== filterStatus) return false
    if (filterTarget !== 'all' && finding.target !== filterTarget) return false
    if (filterSource !== 'all' && finding.sourceKind !== filterSource) return false
    return true
  })

  const findingRowKey = (finding: InstructionAuditFinding, index: number) =>
    `${finding.agentKey}:${finding.target}:${finding.sourceKind}:${finding.userId ?? ''}:${finding.orgId ?? ''}:${index}`

  return (
    <div className="space-y-spacing-5">
      <header className="gap-spacing-4 flex flex-wrap items-start justify-between">
        <div>
          <h1 className="title-h1 text-foreground">INSTRUCTION GOVERNANCE</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            Protocol versions, audit health, and policy-aware repair for agent instructions.
          </p>
        </div>
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="button-glass-neutral gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle flex items-center font-medium transition-all disabled:opacity-40"
          >
            <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
            Refresh audit
          </button>
          <button
            type="button"
            onClick={() => void handleRepair()}
            disabled={repairing || loading}
            className="button-glass-primary gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex items-center font-medium transition-all disabled:opacity-40"
          >
            <Wrench className={`icon-sm ${repairing ? 'animate-pulse' : ''}`} />
            {repairing ? 'Repairing…' : 'Run repair'}
          </button>
        </div>
      </header>

      {error ? <p className="body-3 text-destructive">{error}</p> : null}

      <details className="rounded-spacing-2 border-border bg-muted/15 border">
        <summary className="body-3 text-muted-foreground cursor-pointer select-none px-spacing-4 py-spacing-3 [&::-webkit-details-marker]:hidden">
          <span className="text-foreground font-medium">Scope filters</span>
          <span className="ml-spacing-2">Optional agent_key filter for audit/repair</span>
        </summary>
        <div className="border-border gap-spacing-3 flex flex-wrap items-end border-t px-spacing-4 py-spacing-4">
          <label className="block">
            <span className="body-4 text-muted-foreground mb-spacing-1 block">Agent key</span>
            <input
              type="text"
              value={agentKeyFilter}
              onChange={(e) => setAgentKeyFilter(e.target.value)}
              placeholder="e.g. vibey"
              className="input-glass body-3 h-spacing-10 rounded-spacing-2 px-spacing-3 text-foreground placeholder:text-muted-foreground w-56"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 h-spacing-10 font-medium"
          >
            Apply
          </button>
        </div>
      </details>

      {repairResult ? (
        <Card className="card-glass p-spacing-6">
          <h3 className="title-h5 text-foreground mb-spacing-4">Last repair run</h3>
          <RepairResultPanel result={repairResult} />
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-spacing-5">
        <TabsList variant="liquid" className="ml-auto flex-wrap">
          <TabsTrigger value="overview" className="px-spacing-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="findings" className="px-spacing-4">
            Findings
          </TabsTrigger>
          <TabsTrigger value="policy" className="px-spacing-4">
            Repair policy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="card-glass p-spacing-6">
            <div className="gap-spacing-6 mb-spacing-6 grid grid-cols-2 md:grid-cols-5">
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Total audited</p>
                <p className="title-h4 text-foreground tabular-nums">{totalFindings.toLocaleString()}</p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">OK</p>
                <p className="title-h4 text-emerald tabular-nums">{summary.ok.toLocaleString()}</p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Missing contracts</p>
                <p className="title-h4 text-destructive tabular-nums">
                  {summary.missing_contracts.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Stale contracts</p>
                <p className="title-h4 text-orange tabular-nums">
                  {summary.stale_contracts.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="body-4 text-muted-foreground mb-spacing-1">Missing skill</p>
                <p className="title-h4 text-destructive tabular-nums">
                  {summary.missing_skill.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-border border-t pt-spacing-6">
              <p className="body-4 text-muted-foreground mb-spacing-2">Platform health</p>
              <div className="gap-spacing-3 flex flex-wrap items-center">
                <span
                  className={`${healthOk ? 'badge-glass badge-glass-green' : 'badge-glass badge-glass-orange'} typo-caption font-medium`}
                >
                  {healthOk ? 'ALL CLEAR' : `${issueCount} ISSUE${issueCount === 1 ? '' : 'S'}`}
                </span>
                <span className="body-3 text-muted-foreground">
                  Generated vibey-api + DB skills + TOOLS.md rows
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <div className="mb-spacing-4 gap-spacing-3 flex flex-wrap items-center">
            <FilterDropdown
              label="All statuses"
              value={filterStatus}
              options={statusOptions}
              onChange={setFilterStatus}
            />
            <FilterDropdown
              label="All targets"
              value={filterTarget}
              options={targetOptions}
              onChange={setFilterTarget}
            />
            <FilterDropdown
              label="All sources"
              value={filterSource}
              options={sourceOptions}
              onChange={setFilterSource}
            />
            <span className="body-4 text-muted-foreground">
              {filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="section-card rounded-spacing-3 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Agent
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Target
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Source
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Status
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Classification
                  </th>
                  <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-spacing-3 py-spacing-6 body-3 text-muted-foreground text-center"
                    >
                      No findings match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredFindings.map((finding, index) => {
                    const rowKey = findingRowKey(finding, index)
                    const expanded = expandedKey === rowKey
                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className="border-border hover:bg-hover-subtle cursor-pointer border-t transition-colors"
                          onClick={() => setExpandedKey(expanded ? null : rowKey)}
                        >
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground whitespace-nowrap">
                            {formatAgentKeyDisplay(finding.agentKey)}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">{finding.target}</td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-muted-foreground">
                            {sourceKindLabel(finding.sourceKind)}
                          </td>
                          <td className="px-spacing-3 py-spacing-2">
                            <StatusBadge status={finding.status} />
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-muted-foreground">
                            {finding.classification
                              ? CLASSIFICATION_LABEL[finding.classification]
                              : '—'}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground max-w-md truncate">
                            {finding.message}
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="border-border border-t">
                            <td colSpan={6} className="px-spacing-4 py-spacing-4 bg-muted/10">
                              <FindingDetail finding={finding} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="policy">
          <Card className="card-glass p-spacing-6">
            <h3 className="title-h5 text-foreground mb-spacing-4">TOOLS.md repair policy</h3>
            <p className="body-3 text-muted-foreground mb-spacing-6">
              Custom rows are classified before repair. Only policy-approved rows are overwritten.
            </p>
            <div className="section-card rounded-spacing-3 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Classification
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Auto-repair
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Behavior
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-3 body-3 text-foreground">Generated placeholder</td>
                    <td className="px-spacing-3 py-spacing-3">
                      <span className="badge-glass badge-glass-green typo-caption font-medium">ALLOWED</span>
                    </td>
                    <td className="px-spacing-3 py-spacing-3 body-3 text-muted-foreground">
                      Replace empty or placeholder content with canonical platform guidance.
                    </td>
                  </tr>
                  <tr className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-3 body-3 text-foreground">Platform template copy</td>
                    <td className="px-spacing-3 py-spacing-3">
                      <span className="badge-glass badge-glass-green typo-caption font-medium">ALLOWED</span>
                    </td>
                    <td className="px-spacing-3 py-spacing-3 body-3 text-muted-foreground">
                      Apply runtime guidance updates to platform template copies.
                    </td>
                  </tr>
                  <tr className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-3 body-3 text-foreground">User-authored custom</td>
                    <td className="px-spacing-3 py-spacing-3">
                      <span className="badge-glass badge-glass-red typo-caption font-medium">BLOCKED</span>
                    </td>
                    <td className="px-spacing-3 py-spacing-3 body-3 text-muted-foreground">
                      Preserve user-authored instructions.
                    </td>
                  </tr>
                  <tr className="border-border border-t">
                    <td className="px-spacing-3 py-spacing-3 body-3 text-foreground">Org override</td>
                    <td className="px-spacing-3 py-spacing-3">
                      <span className="badge-glass badge-glass-red typo-caption font-medium">BLOCKED</span>
                    </td>
                    <td className="px-spacing-3 py-spacing-3 body-3 text-muted-foreground">
                      Org policy changes require explicit review.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
