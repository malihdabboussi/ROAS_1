'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ensureSandboxRunning } from '../services/projects.service'
import type { ProjectDeployStatus } from '../types'

const ProjectHeroOrb = dynamic(
  () => import('./ProjectHeroOrb').then((m) => ({ default: m.ProjectHeroOrb })),
  { ssr: false },
)

interface ProjectAppPreviewProps {
  projectId: string
  deployStatus: ProjectDeployStatus
  deployError: string | null
  hasFiles?: boolean
  currentRoute?: string
  refreshKey?: number
  onRetry?: () => void
  showLogs?: boolean
  onToggleLogs?: () => void
}

export function ProjectAppPreview({
  projectId,
  deployStatus,
  deployError: _deployError,
  hasFiles,
  currentRoute = '/',
  refreshKey = 0,
  onRetry: _onRetry,
  showLogs,
  onToggleLogs,
}: ProjectAppPreviewProps) {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const startedRef = useRef(false)

  const startSandbox = useCallback(async () => {
    if (startedRef.current || starting) return
    startedRef.current = true
    setStarting(true)
    try {
      const result = await ensureSandboxRunning(projectId)
      if (result.tunnelUrl) {
        setTunnelUrl(result.tunnelUrl)
      }
    } catch {
      startedRef.current = false
    } finally {
      setStarting(false)
    }
  }, [projectId, starting])

  useEffect(() => {
    if (!hasFiles && deployStatus !== 'running') return
    void startSandbox()
  }, [hasFiles, deployStatus, startSandbox])

  useEffect(() => {
    startedRef.current = false
    setTunnelUrl(null)
  }, [projectId])

  if (tunnelUrl) {
    const iframeSrc = currentRoute === '/' ? tunnelUrl : `${tunnelUrl}${currentRoute}`
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        {onToggleLogs && (
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={onToggleLogs}
              className={`rounded-md p-1.5 transition-colors ${
                showLogs
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
              title="Toggle logs"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>
        )}
        <iframe
          key={`${iframeSrc}::${refreshKey}`}
          src={iframeSrc}
          title="App Preview"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        />
      </div>
    )
  }

  if (starting) {
    return (
      <StatusPane
        icon={<VibeyLoadingOrb state="processing" size="md" />}
        title="STARTING YOUR APP"
        description="Creating sandbox and installing dependencies..."
      />
    )
  }

  if (!hasFiles && deployStatus !== 'running') {
    return <HeroPane />
  }

  return (
    <StatusPane
      icon={<VibeyLoadingOrb state="processing" size="md" />}
      title="LOADING YOUR APPLICATION"
      description="Setting up the development server..."
    />
  )
}

function HeroPane() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      <div className="pointer-events-none relative -mt-32 h-[420px] w-[420px] shrink-0">
        <ProjectHeroOrb />
      </div>
      <div className="relative z-10 -mt-12 flex flex-col items-center gap-3 px-8 text-center">
        <p
          className="text-[11px] font-medium uppercase tracking-[0.25em]"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Live Preview
        </p>
        <h2 className="text-4xl font-light leading-snug tracking-tight text-white">
          Imagine. Describe. Ship.
        </h2>
        <p
          className="max-w-[360px] text-base font-light leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Tell Viktor what you want to build. Your app appears here in real time.
        </p>
      </div>
    </div>
  )
}

function StatusPane({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="body-3 text-muted-foreground max-w-xs">{description}</p>
      </div>
    </div>
  )
}
