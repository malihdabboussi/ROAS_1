'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Mail,
  MousePointer,
  RefreshCcw,
  Search,
  Send,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { emailLogsApi, type EmailLogRow } from '@/features/email/services/email-backend-api'
import {
  SETTINGS_TOAST_ERRORS,
  SETTINGS_TOAST_SUCCESS,
} from '../../config/settings-toast-errors.config'

type LogsType = 'all' | 'single' | 'sequence' | 'broadcast' | 'archived'
type LogsStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'archived'
type LogsSort =
  | 'sent_at.desc'
  | 'sent_at.asc'
  | 'subject.asc'
  | 'subject.desc'
  | 'status.asc'
  | 'status.desc'

const TYPE_OPTIONS: { id: LogsType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'single', label: 'Single' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'archived', label: 'Archived' },
]

const STATUS_OPTIONS: { id: LogsStatus; label: string }[] = [
  { id: 'sent', label: 'Sent' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'opened', label: 'Opened' },
  { id: 'clicked', label: 'Clicked' },
  { id: 'bounced', label: 'Bounced' },
  { id: 'failed', label: 'Failed' },
  { id: 'archived', label: 'Archived' },
]

const SORT_OPTIONS: {
  group: string
  options: { id: LogsSort; label: string; description: string }[]
}[] = [
  {
    group: 'Sent Date',
    options: [
      { id: 'sent_at.desc', label: 'Newest first', description: 'Most recently sent' },
      { id: 'sent_at.asc', label: 'Oldest first', description: 'Earliest sent first' },
    ],
  },
  {
    group: 'Subject',
    options: [
      { id: 'subject.asc', label: 'A → Z', description: 'Alphabetical order' },
      { id: 'subject.desc', label: 'Z → A', description: 'Reverse alphabetical' },
    ],
  },
  {
    group: 'Status',
    options: [
      { id: 'status.asc', label: 'Status A → Z', description: 'Alphabetical by status' },
      { id: 'status.desc', label: 'Status Z → A', description: 'Reverse alphabetical' },
    ],
  },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'bg-gray-500/20 text-gray-400' },
  sent: { label: 'Sent', cls: 'bg-blue-500/20 text-blue-400' },
  delivered: { label: 'Delivered', cls: 'bg-green-500/20 text-green-400' },
  opened: { label: 'Opened', cls: 'bg-purple-500/20 text-purple-400' },
  clicked: { label: 'Clicked', cls: 'bg-indigo-500/20 text-indigo-400' },
  bounced: { label: 'Bounced', cls: 'bg-orange-500/20 text-orange-400' },
  failed: { label: 'Failed', cls: 'bg-red-500/20 text-red-400' },
  spam: { label: 'Spam', cls: 'bg-red-500/20 text-red-400' },
  unsubscribed: { label: 'Unsubscribed', cls: 'bg-yellow-500/20 text-yellow-400' },
}
const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  single: { label: 'Single', cls: 'badge-glass badge-glass-blue' },
  sequence: { label: 'Sequence', cls: 'badge-glass badge-glass-purple' },
  broadcast: { label: 'Broadcast', cls: 'badge-glass badge-glass-green' },
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
function formatDateFull(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function EmailLogsContent() {
  const [logs, setLogs] = useState<EmailLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchValue, setSearchValue] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<LogsType[]>(['all'])
  const [selectedStatuses, setSelectedStatuses] = useState<LogsStatus[]>([])
  const [currentSort, setCurrentSort] = useState<LogsSort>('sent_at.desc')
  const [viewingLog, setViewingLog] = useState<EmailLogRow | null>(null)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [sentFrom, setSentFrom] = useState('')
  const [sentTo, setSentTo] = useState('')
  const limit = 50

  const includeArchived =
    selectedTypes.includes('archived') || selectedStatuses.includes('archived')
  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    (selectedTypes.length > 0 && !selectedTypes.includes('all')) ||
    !!sentFrom ||
    !!sentTo ||
    !!searchValue

  useEffect(() => {
    if (!activeDropdown) return
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('[data-dropdown]') && !t.closest('button')) setActiveDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeDropdown])

  const loadLogs = useCallback(
    async (resetOffset = true) => {
      setLoading(true)
      try {
        const statusFilter = selectedStatuses.filter((s) => s !== 'archived')
        const typeFilter = selectedTypes.filter((t) => t !== 'archived' && t !== 'all')
        const currentOffset = resetOffset ? 0 : offset
        const data = await emailLogsApi.getLogs({
          status: statusFilter[0],
          type: typeFilter[0],
          startDate: sentFrom || undefined,
          endDate: sentTo || undefined,
          includeArchived,
          limit,
          offset: currentOffset,
        })
        if (data.success) {
          if (resetOffset) {
            setLogs(data.logs || [])
            setOffset(limit)
          } else {
            setLogs((prev) => [...prev, ...(data.logs || [])])
            setOffset((prev) => prev + limit)
          }
          setTotal(data.total || 0)
          setHasMore((data.logs || []).length === limit)
        }
      } catch {
        /* Silent fail — backend may not have data yet */
      } finally {
        setLoading(false)
      }
    },
    [selectedStatuses, selectedTypes, offset, includeArchived, sentFrom, sentTo],
  )

  useEffect(() => {
    loadLogs(true)
  }, [loadLogs])

  const filteredLogs = useMemo(() => {
    if (!searchValue) return logs
    const s = searchValue.toLowerCase()
    return logs.filter(
      (l) =>
        l.recipient_email?.toLowerCase().includes(s) ||
        l.recipient_name?.toLowerCase().includes(s) ||
        l.subject?.toLowerCase().includes(s) ||
        l.from_email?.toLowerCase().includes(s),
    )
  }, [logs, searchValue])

  const handleArchiveLog = async (log: EmailLogRow) => {
    try {
      const isArchiving = !log.is_archived
      await emailLogsApi.archiveLog(log.id, isArchiving)
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, is_archived: isArchiving } : l)))
      toast.success(
        isArchiving
          ? SETTINGS_TOAST_SUCCESS.EMAIL_LOG_ARCHIVED.userMessage
          : SETTINGS_TOAST_SUCCESS.EMAIL_LOG_RESTORED.userMessage,
      )
    } catch {
      toast.error(SETTINGS_TOAST_ERRORS.EMAIL_LOG_ARCHIVE_FAILED.userMessage)
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  return (
    <div className="space-y-spacing-4">
      {/* Toolbar — matches legacy EmailLogsHubToolbar 1:1 */}
      {!isSearchExpanded ? (
        <div className="p-spacing-3 sm:p-spacing-4 surface-card border-border rounded-spacing-2 relative sticky top-0 z-20 border">
          <div className="gap-spacing-4 flex items-center justify-between">
            {/* Left: Type Pills */}
            <div className="gap-spacing-2 flex items-center">
              {TYPE_OPTIONS.map((type) => {
                const isSelected = selectedTypes.includes(type.id)
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (type.id === 'all') {
                        setSelectedTypes(['all'])
                      } else {
                        const newTypes = isSelected
                          ? selectedTypes.filter((t) => t !== type.id)
                          : [...selectedTypes.filter((t) => t !== 'all'), type.id]
                        setSelectedTypes(newTypes.length === 0 ? ['all'] : newTypes)
                      }
                    }}
                    className={`pill pill--sm ${isSelected ? 'pill--active' : ''}`}
                  >
                    <span className="relative z-10">{type.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Right: Actions */}
            <div className="gap-spacing-2 relative flex items-center">
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg font-medium"
              >
                <span className="relative z-10 flex items-center gap-1">
                  <Search className="icon-sm" />
                  <Filter className="icon-sm" />
                  {hasActiveFilters && (
                    <span className="ml-spacing-1 p-spacing-1 bg-hover-subtle typo-caption min-w-[20px] rounded text-center text-white">
                      {selectedStatuses.length + (sentFrom ? 1 : 0) + (sentTo ? 1 : 0)}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg font-medium"
              >
                <span className="relative z-10">
                  <ArrowUpDown className="icon-sm" />
                </span>
              </button>
              <button
                onClick={() => loadLogs(true)}
                className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg font-medium"
              >
                <span className="relative z-10">
                  <RefreshCcw className="icon-sm" />
                </span>
              </button>

              {/* Sort dropdown */}
              {activeDropdown === 'sort' && (
                <div className="mt-spacing-1 z-dropdown absolute right-0 top-full" data-dropdown>
                  <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                    <div className="space-y-spacing-3">
                      <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">
                        Sort by
                      </h3>
                      {SORT_OPTIONS.map((group) => (
                        <div key={group.group} className="space-y-spacing-1">
                          <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
                            {group.group}
                          </div>
                          <div className="space-y-0">
                            {group.options.map((option) => {
                              const isSelected = currentSort === option.id
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    setCurrentSort(option.id)
                                    setActiveDropdown(null)
                                  }}
                                  className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-sort-option-selected text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                                >
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="typo-caption text-muted-foreground">
                                      {option.description}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="ml-spacing-2">
                                      <svg
                                        viewBox="0 0 20 20"
                                        className="tint-green relative z-30 h-2.5 w-2.5"
                                        fill="currentColor"
                                        style={{
                                          filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))',
                                        }}
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded search/filter mode */
        <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 sticky top-0 z-20 border">
          <div className="relative">
            <div className="gap-spacing-2 sm:gap-spacing-3 mb-spacing-3 sm:mb-spacing-4 flex items-center">
              <div className="min-w-0 flex-1">
                <input
                  className="input-glass w-full"
                  placeholder="Search email logs..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchExpanded(false)
                  setActiveDropdown(null)
                }}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4"
              >
                Cancel
              </button>
            </div>
            <div className="gap-spacing-2 relative flex flex-wrap items-center">
              {/* Status filter */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                  className={`gap-spacing-1 h-spacing-8 px-spacing-3 rounded-spacing-2 body-3 flex items-center border ${selectedStatuses.length > 0 ? 'border-muted-foreground-light' : 'border-border'} ${activeDropdown === 'status' ? 'bg-hover-subtle' : ''}`}
                >
                  Status{' '}
                  {selectedStatuses.length > 0 && (
                    <span className="ml-spacing-1 p-spacing-1 bg-hover-subtle typo-caption min-w-[20px] rounded text-center text-white">
                      {selectedStatuses.length}
                    </span>
                  )}
                  <ChevronDown className="icon-sm ml-spacing-1" />
                </button>
                {activeDropdown === 'status' && (
                  <div className="mt-spacing-1 z-dropdown absolute left-0 top-full" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-2 min-w-40">
                      <div className="space-y-spacing-1">
                        {STATUS_OPTIONS.map((status) => {
                          const isSelected = selectedStatuses.includes(status.id)
                          return (
                            <button
                              key={status.id}
                              className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-hover-subtle flex w-full cursor-pointer items-center text-left"
                              type="button"
                              onClick={() => {
                                setSelectedStatuses(
                                  isSelected
                                    ? selectedStatuses.filter((s) => s !== status.id)
                                    : [...selectedStatuses, status.id],
                                )
                              }}
                            >
                              {isSelected ? (
                                <Check className="icon-sm text-primary" />
                              ) : (
                                <div className="icon-sm" />
                              )}
                              <span className="body-3 text-muted-foreground">{status.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Date range filter */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                  className={`gap-spacing-1 h-spacing-8 px-spacing-3 rounded-spacing-2 body-3 flex items-center border ${sentFrom || sentTo ? 'border-muted-foreground-light' : 'border-border'} ${activeDropdown === 'date' ? 'bg-hover-subtle' : ''}`}
                >
                  <Calendar className="icon-sm" /> Sent Date{' '}
                  <ChevronDown className="icon-sm ml-spacing-1" />
                </button>
                {activeDropdown === 'date' && (
                  <div className="mt-spacing-1 z-dropdown absolute right-0 top-full" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-3 min-w-64">
                      <div className="space-y-spacing-2">
                        <div>
                          <label className="typo-caption text-muted-foreground">From</label>
                          <input
                            type="date"
                            className="input-glass mt-spacing-1 w-full"
                            value={sentFrom}
                            onChange={(e) => setSentFrom(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="typo-caption text-muted-foreground">To</label>
                          <input
                            type="date"
                            className="input-glass mt-spacing-1 w-full"
                            value={sentTo}
                            onChange={(e) => setSentTo(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedStatuses([])
                    setSelectedTypes(['all'])
                    setSentFrom('')
                    setSentTo('')
                    setSearchValue('')
                  }}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="surface-card border-border rounded-spacing-3 overflow-hidden border">
        {filteredLogs.length === 0 ? (
          <div className="py-spacing-12 px-spacing-6 flex flex-col items-center justify-center">
            <Mail className="icon-lg text-muted-foreground mb-spacing-3" />
            <p className="body-1 text-foreground font-medium">No email logs yet</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Email logs will appear here once you start sending emails.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-[200px] text-left font-medium">
                      Recipient
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Subject
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-[90px] text-left font-medium">
                      Type
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-[100px] text-left font-medium">
                      Status
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-[140px] text-left font-medium">
                      Sent
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground w-[80px] text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const sb = STATUS_BADGE[log.status] ?? {
                      label: log.status,
                      cls: 'bg-gray-500/20 text-gray-400',
                    }
                    const tb = TYPE_BADGE[log.email_type] ?? {
                      label: log.email_type,
                      cls: 'badge-glass',
                    }
                    return (
                      <tr
                        key={log.id}
                        className="border-border hover:bg-hover-subtle cursor-pointer border-b transition-colors last:border-b-0"
                        onClick={() => setViewingLog(log)}
                      >
                        <td className="px-spacing-3 py-spacing-2">
                          <div className="body-3 text-foreground truncate font-medium">
                            {log.recipient_name || log.recipient_email || '—'}
                          </div>
                          {log.recipient_name && (
                            <div className="body-4 text-muted-foreground truncate">
                              {log.recipient_email}
                            </div>
                          )}
                        </td>
                        <td className="px-spacing-3 py-spacing-2">
                          <span className="body-3 text-foreground block truncate">
                            {log.subject || '(No subject)'}
                          </span>
                        </td>
                        <td className="px-spacing-3 py-spacing-2">
                          <span className={`${tb.cls} typo-caption font-medium`}>{tb.label}</span>
                        </td>
                        <td className="px-spacing-3 py-spacing-2">
                          <span
                            className={`px-spacing-2 py-spacing-1 rounded-spacing-1 typo-caption inline-flex items-center font-medium ${sb.cls}`}
                          >
                            {sb.label}
                          </span>
                        </td>
                        <td className="px-spacing-3 py-spacing-2">
                          <span className="body-4 text-muted-foreground">
                            {formatDate(log.sent_at)}
                          </span>
                        </td>
                        <td className="px-spacing-3 py-spacing-2 text-right">
                          <div
                            className="gap-spacing-1 flex items-center justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setViewingLog(log)}
                              className="btn-icon-glass"
                              title="View Details"
                            >
                              <Eye className="icon-sm" />
                            </button>
                            <button
                              onClick={() => handleArchiveLog(log)}
                              className="btn-icon-glass"
                              title={log.is_archived ? 'Unarchive' : 'Archive'}
                            >
                              {log.is_archived ? (
                                <ArchiveRestore className="icon-sm" />
                              ) : (
                                <Archive className="icon-sm" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="px-spacing-4 py-spacing-3 border-border flex items-center justify-between border-t">
                <span className="body-4 text-muted-foreground">
                  Showing {filteredLogs.length} of {total}
                </span>
                <button
                  onClick={() => loadLogs(false)}
                  disabled={loading}
                  className="button-glass-blue px-spacing-3 py-spacing-1 rounded-spacing-2 body-3 font-medium"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ViewEmailLogDialog log={viewingLog} onClose={() => setViewingLog(null)} />
    </div>
  )
}

function ViewEmailLogDialog({ log, onClose }: { log: EmailLogRow | null; onClose: () => void }) {
  if (!log) return null
  const sb = STATUS_BADGE[log.status] ?? { label: log.status, cls: 'bg-gray-500/20 text-gray-400' }
  const tb = TYPE_BADGE[log.email_type] ?? { label: log.email_type, cls: 'badge-glass' }

  return (
    <DialogPrimitive.Root open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Email Log Details</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-3xl">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare right-spacing-4 top-spacing-4 absolute z-10"
              >
                <X className="icon-xs" />
              </button>
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
                <h2 className="title-h6">Email Log Details</h2>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  View details and status of this email send.
                </p>
              </div>
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-6 flex-1 overflow-y-auto">
                <div className="gap-spacing-3 flex flex-wrap items-center">
                  <span
                    className={`gap-spacing-1 px-spacing-2 py-spacing-1 rounded-spacing-1 typo-caption inline-flex items-center font-medium ${sb.cls}`}
                  >
                    {sb.label}
                  </span>
                  <span className={`${tb.cls} typo-caption font-medium`}>{tb.label}</span>
                  {log.is_archived && (
                    <span className="badge-glass badge-glass-secondary-bg typo-caption gap-spacing-1 inline-flex items-center font-medium">
                      <Archive className="h-3 w-3" />
                      Archived
                    </span>
                  )}
                </div>
                <div className="container-glass-nested p-spacing-4 space-y-spacing-4">
                  <h3 className="body-2 text-foreground font-medium">Email Details</h3>
                  <div className="space-y-spacing-1">
                    <label className="typo-caption text-muted-foreground uppercase tracking-wider">
                      Subject
                    </label>
                    <p className="body-2 text-foreground">{log.subject || '(No subject)'}</p>
                  </div>
                  <div className="gap-spacing-4 grid grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-spacing-1">
                      <label className="typo-caption text-muted-foreground gap-spacing-1 flex items-center uppercase tracking-wider">
                        <User className="h-3 w-3" /> Recipient
                      </label>
                      <p className="body-2 text-foreground">{log.recipient_name || '—'}</p>
                      <p className="body-3 text-muted-foreground">{log.recipient_email || '—'}</p>
                    </div>
                    <div className="space-y-spacing-1">
                      <label className="typo-caption text-muted-foreground gap-spacing-1 flex items-center uppercase tracking-wider">
                        <Mail className="h-3 w-3" /> From
                      </label>
                      <p className="body-2 text-foreground">{log.from_email || '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="container-glass-nested p-spacing-4 space-y-spacing-4">
                  <h3 className="body-2 text-foreground gap-spacing-2 flex items-center font-medium">
                    <Clock className="icon-sm" /> Timeline
                  </h3>
                  <div className="space-y-spacing-3">
                    {[
                      { label: 'Created', date: log.created_at, Icon: Calendar, active: true },
                      { label: 'Sent', date: log.sent_at, Icon: Send, active: !!log.sent_at },
                      {
                        label: 'Delivered',
                        date: log.delivered_at,
                        Icon: CheckCircle,
                        active: !!log.delivered_at,
                      },
                      { label: 'Opened', date: log.opened_at, Icon: Mail, active: !!log.opened_at },
                      {
                        label: 'Clicked',
                        date: log.clicked_at,
                        Icon: MousePointer,
                        active: !!log.clicked_at,
                      },
                    ].map((item, i, arr) => (
                      <div
                        key={item.label}
                        className={`py-spacing-2 flex items-center justify-between ${i < arr.length - 1 ? 'border-border border-b' : ''}`}
                      >
                        <div className="gap-spacing-2 flex items-center">
                          <div
                            className={`h-spacing-6 w-spacing-6 flex items-center justify-center rounded-full ${item.active ? 'bg-primary/10 border-primary/20 border' : 'bg-muted/30'}`}
                          >
                            <item.Icon
                              className={`h-3 w-3 ${item.active ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                          </div>
                          <span className="body-3 text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="body-3 text-foreground">{formatDateFull(item.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="container-glass-nested p-spacing-4 space-y-spacing-3">
                  <h3 className="body-2 text-foreground gap-spacing-2 flex items-center font-medium">
                    <Mail className="icon-sm" /> Email Body
                  </h3>
                  {log.html_body ? (
                    <div className="bg-background rounded-spacing-2 p-spacing-4 border-border max-h-[300px] overflow-y-auto border">
                      <div
                        className="body-3 text-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: log.html_body }}
                      />
                    </div>
                  ) : (
                    <div className="bg-muted/10 rounded-spacing-2 p-spacing-4 text-center">
                      <Mail className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
                      <p className="body-3 text-muted-foreground">
                        Email body not available for this log.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex flex-shrink-0 items-center justify-end border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
