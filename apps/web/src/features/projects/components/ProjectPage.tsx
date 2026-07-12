'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ResizableDivider } from '@/features/studio/components/layout/ResizableDivider'
import { usePanelResize } from '@/features/studio/hooks/usePanelResize'
import { buildPublishedAppUrl } from '@/lib/platform/platform-urls'
import { useProjectChat } from '../hooks/useProjectChat'
import { fetchAllProjectFiles, type ProjectFileMap } from '../services/project-files.service'
import {
  connectProjectDomain,
  getProject,
  publishProject,
  restartProjectApp,
  unpublishProject,
} from '../services/projects.service'
import type { ProjectRepo } from '../types'
import { ProjectAgentsPanel } from './ProjectAgentsPanel'
import { ProjectAppPreview } from './ProjectAppPreview'
import { ProjectChatPane } from './ProjectChatPane'
import { ProjectCodeView } from './ProjectCodeView'
import {
  ProjectPreviewToolbar,
  type ProjectRoute,
  type ProjectViewMode,
} from './ProjectPreviewToolbar'
import { ProjectSupabasePanel } from './ProjectSupabasePanel'

function extractAppRoutes(files: Record<string, string>): ProjectRoute[] {
  const routes: ProjectRoute[] = []
  for (const filePath of Object.keys(files)) {
    const match = filePath.match(/^\/app(\/.*)?\/page\.(tsx|jsx|ts|js)$/)
    if (!match) continue
    if (filePath.includes('/api/')) continue
    if (filePath.includes('/__')) continue
    const rawPath = match[1] || ''
    const cleaned = rawPath.replace(/\/\([^)]+\)/g, '')
    routes.push({ path: cleaned || '/', filePath })
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path))
}

interface ProjectPageProps {
  projectId: string
}

export function ProjectPage({ projectId }: ProjectPageProps) {
  const [project, setProject] = useState<ProjectRepo | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProject = useCallback(async () => {
    try {
      const proj = await getProject(projectId)
      setProject(proj)
    } catch {
      /* keep existing state */
    }
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    void refreshProject().finally(() => setLoading(false))
  }, [refreshProject])

  const {
    conversationId,
    messages,
    isStreaming,
    agentPhase,
    sendMessage,
    ready: chatReady,
  } = useProjectChat({
    projectId,
    projectName: project?.name ?? '',
    conversationId: project?.conversation_id ?? null,
    agentKey: 'viktor',
    open: !loading && !!project,
  })

  const wasStreamingRef = useRef(false)
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      void refreshProject()
      setCachedFiles(null)
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming, refreshProject])

  const deployStatus = project?.deploy_status ?? 'pending'
  const publishStatus = project?.publish_status ?? 'unpublished'
  const isTransitional =
    deployStatus === 'syncing' || deployStatus === 'installing' || deployStatus === 'starting'
  const isPublishing = publishStatus === 'building' || publishStatus === 'deploying'

  const [autoRecovering, setAutoRecovering] = useState(false)
  const autoRecoveryAttemptedRef = useRef(false)

  useEffect(() => {
    if (deployStatus !== 'error' || autoRecoveryAttemptedRef.current || !project) return
    autoRecoveryAttemptedRef.current = true
    setAutoRecovering(true)
    void restartProjectApp(project.id)
      .then(() => refreshProject())
      .catch(() => {})
      .finally(() => setAutoRecovering(false))
  }, [deployStatus, project, refreshProject])

  const effectiveDeployStatus =
    autoRecovering || deployStatus === 'error' ? 'starting' : deployStatus

  useEffect(() => {
    if (
      !isTransitional &&
      !isPublishing &&
      !isStreaming &&
      !autoRecovering &&
      deployStatus !== 'error'
    )
      return
    const interval = setInterval(() => void refreshProject(), 3_000)
    return () => clearInterval(interval)
  }, [isTransitional, isPublishing, isStreaming, autoRecovering, refreshProject])

  const [activeView, setActiveView] = useState<ProjectViewMode>('preview')
  const [cachedFiles, setCachedFiles] = useState<ProjectFileMap | null>(null)
  const [currentRoute, setCurrentRoute] = useState('/')
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const appRoutes = cachedFiles ? extractAppRoutes(cachedFiles.files) : []
  const hasFiles = !!cachedFiles && Object.keys(cachedFiles.files).length > 0

  useEffect(() => {
    if (!project) return
    let cancelled = false
    fetchAllProjectFiles(project.id)
      .then((result) => {
        if (!cancelled && Object.keys(result.files).length > 0) {
          setCachedFiles((prev) => prev ?? result)
        }
      })
      .catch((err) => {
        console.error('[ProjectPage] fetchAllProjectFiles', err)
      })
    return () => {
      cancelled = true
    }
  }, [project?.id])

  useEffect(() => {
    const schedulePreviewRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        setPreviewRefreshKey((k) => k + 1)
      }, 800)
    }

    const onFileChanged = (e: Event) => {
      const { projectId: pid, path, content } = (e as CustomEvent).detail ?? {}
      if (pid !== projectId || !path) return
      setCachedFiles((prev) =>
        prev ? { ...prev, files: { ...prev.files, [path as string]: content as string } } : null,
      )
      schedulePreviewRefresh()
    }
    const onFileDeleted = (e: Event) => {
      const { projectId: pid, path } = (e as CustomEvent).detail ?? {}
      if (pid !== projectId || !path) return
      setCachedFiles((prev) => {
        if (!prev) return null
        const next = { ...prev.files }
        delete next[path as string]
        return { ...prev, files: next }
      })
      schedulePreviewRefresh()
    }
    window.addEventListener('project:file-changed', onFileChanged)
    window.addEventListener('project:file-deleted', onFileDeleted)
    return () => {
      window.removeEventListener('project:file-changed', onFileChanged)
      window.removeEventListener('project:file-deleted', onFileDeleted)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [projectId])

  const handlePublish = useCallback(async () => {
    const result = await publishProject(projectId)
    setProject((prev) =>
      prev
        ? {
            ...prev,
            slug: result.slug,
            publish_status: result.publish_status as ProjectRepo['publish_status'],
            publish_error: null,
            ...(result.publish_status === 'published'
              ? { is_published: true, published_url: buildPublishedAppUrl(result.slug) }
              : {}),
          }
        : prev,
    )
  }, [projectId])

  const handleUnpublish = useCallback(async () => {
    await unpublishProject(projectId)
    setProject((prev) =>
      prev
        ? {
            ...prev,
            is_published: false,
            published_url: null,
            publish_status: 'draft',
            domain_id: null,
          }
        : prev,
    )
  }, [projectId])

  const handleConnectDomain = useCallback(
    async (domainId: string) => {
      const result = await connectProjectDomain(projectId, domainId)
      setProject((prev) =>
        prev
          ? {
              ...prev,
              domain_id: domainId,
              published_url: result.published_url ?? prev.published_url,
            }
          : prev,
      )
    },
    [projectId],
  )

  const { chatWidthPercent, isDragging, containerRef, handleMouseDown } = usePanelResize({
    defaultWidthPercent: 35,
    minPercent: 20,
    maxPercent: 60,
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading project..." state="processing" size="lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-muted-foreground)]">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`relative flex min-h-0 flex-col ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ width: `${chatWidthPercent}%`, minWidth: '300px' }}
        >
          <ProjectChatPane
            conversationId={conversationId}
            messages={messages}
            isStreaming={isStreaming}
            agentPhase={agentPhase}
            ready={chatReady}
            onSend={sendMessage}
          />
        </div>

        <ResizableDivider onMouseDown={handleMouseDown} isDragging={isDragging} compact />

        <div
          className={`pr-spacing-4 pb-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden ${
            isDragging ? '' : 'transition-[flex] duration-300 ease-in-out'
          }`}
        >
          <ProjectPreviewToolbar
            deployStatus={effectiveDeployStatus}
            publishStatus={publishStatus}
            isPublished={project.is_published}
            publishedUrl={project.published_url}
            publishError={project.publish_error}
            vercelProjectId={project.vercel_project_id}
            activeView={activeView}
            onViewChange={setActiveView}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onConnectDomain={handleConnectDomain}
            routes={appRoutes}
            currentRoute={currentRoute}
            onRouteChange={setCurrentRoute}
          />
          <div className="card-glass mt-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
            {activeView === 'preview' && (
              <ProjectAppPreview
                projectId={project.id}
                deployStatus={effectiveDeployStatus}
                deployError={project.deploy_error}
                hasFiles={hasFiles}
                currentRoute={currentRoute}
                refreshKey={previewRefreshKey}
                onRetry={() => {
                  void sendMessage('The app has an error. Please check the logs and fix it.')
                }}
              />
            )}
            {activeView === 'code' && (
              <ProjectCodeView
                projectId={project.id}
                cachedFiles={cachedFiles}
                onFilesLoaded={setCachedFiles}
              />
            )}
            {activeView === 'agents' && (
              <ProjectAgentsPanel
                cachedFiles={cachedFiles}
                onIntegrate={(message) => {
                  setActiveView('preview')
                  void sendMessage(message)
                }}
              />
            )}
            {activeView === 'database' && (
              <ProjectSupabasePanel
                project={project}
                onProjectUpdated={() => void refreshProject()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
