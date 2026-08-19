'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react'
import { Check, Copy, Download, FileText, Search, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { getSandpackThemeFromCss } from '../lib/sandpack-theme'
import { fetchAllProjectFiles, type ProjectFileMap } from '../services/project-files.service'

interface ProjectCodeViewProps {
  projectId: string
  cachedFiles?: ProjectFileMap | null
  onFilesLoaded?: (fileMap: ProjectFileMap) => void
}

const sandpackOverrides = `
.pcv-root .sp-wrapper { height: 100%; display: flex; flex-direction: column; flex: 1; background: transparent !important; }
.pcv-root .sp-file-explorer { background: transparent !important; height: 100%; }
.pcv-root .sp-code-editor { background: transparent !important; height: 100%; }
.pcv-root .sp-tabs { background: transparent !important; border-bottom: 1px solid var(--color-border); }
.pcv-root .sp-tab-button { color: var(--color-muted-foreground); font-size: 12px; }
.pcv-root .sp-tab-button[data-active="true"] { color: var(--color-foreground); }
.pcv-root .cm-gutters { background: transparent !important; border-right: 1px solid var(--color-border); }
.pcv-root .cm-gutter { color: var(--color-muted-foreground); }
.pcv-root .cm-activeLine { background: rgba(255,255,255,0.03) !important; }
.pcv-root .cm-activeLineGutter { background: rgba(255,255,255,0.03) !important; }
`

function CodeViewActions() {
  const { sandpack } = useSandpack()
  const [copied, setCopied] = useState(false)

  const activeFile = sandpack.activeFile
  const content = sandpack.files[activeFile]?.code ?? ''
  const fileName = activeFile.split('/').pop() ?? activeFile

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [content, fileName])

  return (
    <div className="gap-spacing-1 absolute right-2 top-1.5 z-10 flex items-center">
      <button
        type="button"
        onClick={handleCopy}
        data-tooltip={copied ? 'Copied!' : 'Copy file'}
        data-side="bottom"
        className="tooltip chip-glass-neutral hover:chip-glass-blue flex h-6 w-6 items-center justify-center rounded-md transition-all"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        data-tooltip="Download file"
        data-side="left"
        className="tooltip chip-glass-neutral hover:chip-glass-blue flex h-6 w-6 items-center justify-center rounded-md transition-all"
      >
        <Download className="h-3 w-3" />
      </button>
    </div>
  )
}

function FileTreeWithSearch() {
  const { sandpack } = useSandpack()
  const [searchQuery, setSearchQuery] = useState('')
  const q = searchQuery.trim().toLowerCase()

  const allFiles = useMemo(
    () =>
      Object.keys(sandpack.files)
        .filter((f) => !f.includes('/node_modules/'))
        .sort(),
    [sandpack.files],
  )

  const filtered = useMemo(
    () => (q ? allFiles.filter((f) => f.toLowerCase().includes(q)) : []),
    [allFiles, q],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="body-2 text-foreground shrink-0 font-medium">FILES</span>
      </div>
      <div className="border-border border-b px-2 py-2">
        <div className="input-glass gap-spacing-2 rounded-spacing-2 px-spacing-3 h-spacing-8 flex w-full items-center py-0">
          <Search className="icon-xs text-muted-foreground shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="body-3 text-foreground placeholder:text-muted-foreground min-h-0 min-w-0 flex-1 bg-transparent leading-none focus:outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Clear search"
            >
              <X className="icon-xs shrink-0" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        {q ? (
          filtered.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {filtered.map((filePath) => {
                const name = filePath.split('/').pop() ?? filePath
                const isActive = sandpack.activeFile === filePath
                return (
                  <button
                    key={filePath}
                    type="button"
                    onClick={() => sandpack.openFile(filePath)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <span className="body-3 block truncate font-medium">{name}</span>
                      <span className="block truncate text-[10px] opacity-50">{filePath}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="body-3 text-muted-foreground px-2 py-4 text-center">No files match</p>
          )
        ) : (
          <SandpackFileExplorer />
        )}
      </div>
    </div>
  )
}

export function ProjectCodeView({ projectId, cachedFiles, onFilesLoaded }: ProjectCodeViewProps) {
  const [files, setFiles] = useState<Record<string, string> | null>(cachedFiles?.files ?? null)
  const [entryPoint, setEntryPoint] = useState(cachedFiles?.entryPoint ?? '/App.tsx')
  const [loading, setLoading] = useState(!cachedFiles)
  const [error, setError] = useState<string | null>(null)

  const sandpackTheme = useMemo(() => getSandpackThemeFromCss(), [])

  useEffect(() => {
    if (cachedFiles) {
      setFiles(cachedFiles.files)
      setEntryPoint(cachedFiles.entryPoint)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllProjectFiles(projectId)
      .then((result) => {
        if (cancelled) return
        setFiles(result?.files ?? [])
        setEntryPoint(result.entryPoint)
        onFilesLoaded?.(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load files')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, cachedFiles, onFilesLoaded])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading project files..." state="processing" size="lg" />
      </div>
    )
  }

  if (error || !files) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="body-3 text-muted-foreground">{error || 'No files found.'}</p>
      </div>
    )
  }

  return (
    <div className="pcv-root flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: sandpackOverrides }} />
      <SandpackProvider
        template="react-ts"
        theme={sandpackTheme}
        files={files}
        customSetup={{ entry: entryPoint }}
        options={{
          activeFile: entryPoint,
          visibleFiles: [entryPoint],
          recompileMode: 'immediate',
          recompileDelay: 200,
        }}
      >
        <div className="flex h-full min-h-0 flex-1 overflow-hidden">
          <div
            className="border-border flex min-h-0 shrink-0 flex-col border-r"
            style={{ width: 220 }}
          >
            <FileTreeWithSearch />
          </div>

          <div className="relative min-h-0 flex-1">
            <CodeViewActions />
            <div className="absolute inset-0">
              <SandpackCodeEditor
                readOnly
                showTabs
                showLineNumbers
                wrapContent
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </SandpackProvider>
    </div>
  )
}
