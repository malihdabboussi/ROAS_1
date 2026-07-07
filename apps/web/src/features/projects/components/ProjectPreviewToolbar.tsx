'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  Check,
  ChevronDown,
  Code,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
} from 'lucide-react'
import { ConnectCustomDomainModal } from '@/components/domains'
import type { ProjectDeployStatus, ProjectPublishStatus } from '../types'

export type ProjectViewMode = 'preview' | 'code' | 'agents' | 'database'

export interface ProjectRoute {
  path: string
  filePath: string
}

interface ProjectPreviewToolbarProps {
  deployStatus: ProjectDeployStatus
  publishStatus: ProjectPublishStatus
  isPublished: boolean
  publishedUrl: string | null
  publishError: string | null
  vercelProjectId: string | null
  activeView: ProjectViewMode
  onViewChange: (view: ProjectViewMode) => void
  onPublish: () => Promise<void>
  onUnpublish: () => Promise<void>
  onConnectDomain: (domainId: string) => Promise<void>
  routes?: ProjectRoute[]
  currentRoute?: string
  onRouteChange?: (route: string) => void
}

export function ProjectPreviewToolbar({
  deployStatus,
  publishStatus,
  isPublished,
  publishedUrl,
  publishError,
  vercelProjectId,
  activeView,
  onViewChange,
  onPublish,
  onUnpublish,
  onConnectDomain,
  routes,
  currentRoute = '/',
  onRouteChange,
}: ProjectPreviewToolbarProps) {
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false)
  const [routeDropdownPosition, setRouteDropdownPosition] = useState({ top: 0, left: 0 })
  const routeBtnRef = useRef<HTMLButtonElement>(null)

  const ROUTE_DROPDOWN_WIDTH = 220
  useEffect(() => {
    if (routeDropdownOpen && routeBtnRef.current) {
      const rect = routeBtnRef.current.getBoundingClientRect()
      const left = Math.max(8, rect.left + rect.width / 2 - ROUTE_DROPDOWN_WIDTH / 2)
      setRouteDropdownPosition({ top: rect.bottom + 4, left })
    }
  }, [routeDropdownOpen])

  useEffect(() => {
    if (!routeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-route-dropdown]') && !routeBtnRef.current?.contains(target)) {
        setRouteDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [routeDropdownOpen])

  const handlePublish = useCallback(async () => {
    setPublishing(true)
    try {
      await onPublish()
    } finally {
      setPublishing(false)
    }
  }, [onPublish])

  const handleUnpublish = useCallback(async () => {
    setUnpublishing(true)
    try {
      await onUnpublish()
      setDropdownOpen(false)
    } finally {
      setUnpublishing(false)
    }
  }, [onUnpublish])

  const handleCopy = useCallback(() => {
    if (!publishedUrl) return
    navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [publishedUrl])

  const isRunning = deployStatus === 'running'

  return (
    <div className="gap-spacing-1 pr-spacing-4 pt-spacing-4 flex w-full min-w-0 items-center">
      <div
        className="gap-spacing-1 flex min-w-0 flex-1 basis-0 items-center justify-start overflow-x-auto py-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          type="button"
          onClick={() => onViewChange('preview')}
          className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex shrink-0 items-center transition-all duration-[600ms] ease-in-out ${activeView === 'preview' ? 'chip-glass-blue px-spacing-3' : 'chip-glass-neutral px-spacing-2'}`}
        >
          <Eye className="h-4 w-4" />
          {activeView === 'preview' && (
            <span className="body-2 whitespace-nowrap font-semibold">Preview</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onViewChange('code')}
          className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex shrink-0 items-center transition-all duration-[600ms] ease-in-out ${activeView === 'code' ? 'chip-glass-blue px-spacing-3' : 'chip-glass-neutral px-spacing-2'}`}
        >
          <Code className="h-4 w-4" />
          {activeView === 'code' && (
            <span className="body-2 whitespace-nowrap font-semibold">Code</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onViewChange('agents')}
          className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex shrink-0 items-center transition-all duration-[600ms] ease-in-out ${activeView === 'agents' ? 'chip-glass-blue px-spacing-3' : 'chip-glass-neutral px-spacing-2'}`}
        >
          <Bot className="h-4 w-4" />
          {activeView === 'agents' && (
            <span className="body-2 whitespace-nowrap font-semibold">Agents</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onViewChange('database')}
          className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex shrink-0 items-center transition-all duration-[600ms] ease-in-out ${activeView === 'database' ? 'chip-glass-blue px-spacing-3' : 'chip-glass-neutral px-spacing-2'}`}
        >
          <Database className="h-4 w-4" />
          {activeView === 'database' && (
            <span className="body-2 whitespace-nowrap font-semibold">Database</span>
          )}
        </button>
      </div>

      <div className="px-spacing-2 flex shrink-0 items-center justify-center">
        {routes && routes.length > 0 && (
          <div className="relative">
            <button
              ref={routeBtnRef}
              type="button"
              onClick={() => setRouteDropdownOpen((o) => !o)}
              className="chip-glass-neutral rounded-spacing-2 flex min-w-[120px] cursor-pointer items-center justify-between gap-1.5 px-2.5 py-1"
            >
              <span className="body-3 font-mono font-medium text-[var(--color-foreground)]">
                {currentRoute}
              </span>
              <ChevronDown className="icon-sm text-[var(--color-muted-foreground)]" />
            </button>
            {routeDropdownOpen &&
              createPortal(
                <div
                  data-route-dropdown
                  className="surface-card border-border z-dropdown rounded-spacing-3 fixed min-w-[200px] border p-1 shadow-lg"
                  style={{
                    top: routeDropdownPosition.top,
                    left: routeDropdownPosition.left,
                    width: ROUTE_DROPDOWN_WIDTH,
                  }}
                >
                  {routes.map((route) => {
                    const isActive = route.path === currentRoute
                    return (
                      <button
                        key={route.path}
                        type="button"
                        onClick={() => {
                          onRouteChange?.(route.path)
                          setRouteDropdownOpen(false)
                        }}
                        className={`body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
                        }`}
                      >
                        <span className="min-w-0 truncate font-mono">{route.path}</span>
                      </button>
                    )
                  })}
                </div>,
                document.body,
              )}
          </div>
        )}
      </div>

      <div className="gap-spacing-2 flex min-w-0 flex-1 basis-0 items-center justify-end">
        <DeployStatusBadge status={deployStatus} />

        {publishStatus === 'building' || publishStatus === 'deploying' ? (
          <button
            type="button"
            disabled
            className="button-glass-accent h-spacing-8 px-spacing-3 gap-spacing-2 flex items-center rounded-lg text-xs font-semibold opacity-80 transition-all"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {publishStatus === 'building' ? 'Building...' : 'Deploying...'}
          </button>
        ) : publishStatus === 'failed' ? (
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!isRunning || publishing}
            className="button-glass-accent h-spacing-8 px-spacing-3 gap-spacing-2 flex items-center rounded-lg text-xs font-semibold transition-all"
            title={publishError ?? 'Publish failed — click to retry'}
          >
            <Globe className="h-3.5 w-3.5" />
            Retry Publish
          </button>
        ) : publishStatus === 'draft' ? (
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing}
            className="button-glass-accent h-spacing-8 px-spacing-3 gap-spacing-2 flex items-center rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            Re-publish
          </button>
        ) : !isPublished ? (
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!isRunning || publishing}
            className="button-glass-accent h-spacing-8 px-spacing-3 gap-spacing-2 flex items-center rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            title={!isRunning ? 'App must be running to publish' : undefined}
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            Publish
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="chip-glass-blue h-spacing-8 px-spacing-3 gap-spacing-2 flex items-center rounded-lg text-xs font-semibold transition-all"
            >
              <Globe className="h-3.5 w-3.5" />
              Published
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="surface-card border-border absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-3 shadow-xl">
                  {publishedUrl && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={publishedUrl.replace('https://', '')}
                        className="input-glass body-4 h-7 min-w-0 flex-1 rounded-md px-2"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="chip-glass-neutral flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chip-glass-neutral flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={publishing}
                    className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    {publishing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Update
                  </button>
                  {vercelProjectId && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        setDomainModalOpen(true)
                      }}
                      className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Connect custom domain
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleUnpublish()}
                    disabled={unpublishing}
                    className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    {unpublishing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Take Offline
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ConnectCustomDomainModal
        open={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        title="Connect custom domain"
        onConnect={async (domainId) => {
          await onConnectDomain(domainId)
          setDomainModalOpen(false)
        }}
      />
    </div>
  )
}

function DeployStatusBadge({ status }: { status: ProjectDeployStatus }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Ready', color: 'text-muted-foreground' },
    syncing: { label: 'Syncing', color: 'text-yellow-400' },
    installing: { label: 'Installing', color: 'text-yellow-400' },
    starting: { label: 'Starting', color: 'text-yellow-400' },
    running: { label: 'Running', color: 'text-emerald-400' },
    stopped: { label: 'Stopped', color: 'text-muted-foreground' },
    error: { label: 'Error', color: 'text-destructive' },
  }
  const { label, color } = config[status] ?? config.pending!
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'running'
            ? 'animate-pulse bg-emerald-400'
            : status === 'error'
              ? 'bg-destructive'
              : ['syncing', 'installing', 'starting'].includes(status)
                ? 'animate-pulse bg-yellow-400'
                : 'bg-muted-foreground/40'
        }`}
      />
      {label}
    </span>
  )
}
