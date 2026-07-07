'use client'

import { useMemo, useState } from 'react'
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackProvider,
  SandpackPreview as SandpackRuntimePreview,
} from '@codesandbox/sandpack-react'
import { Code, Eye } from 'lucide-react'
import { getSandpackThemeFromCss } from '../lib/sandpack-theme'
import { normalizeSandpackPath } from '../services/project-files.service'

interface ProjectFilesPanelProps {
  files: Record<string, string>
  dependencies?: Record<string, string>
  entryPoint?: string
}

function resolveSandpackFiles(files: Record<string, string>): Record<string, string> {
  const hasRootApp = '/App.tsx' in files || '/App.jsx' in files
  const hasSrcApp = '/src/App.tsx' in files || '/src/App.jsx' in files

  if (hasSrcApp && !hasRootApp) {
    const ext = '/src/App.tsx' in files ? 'tsx' : 'jsx'
    return {
      ...files,
      [`/index.${ext}`]: [
        'import React, { StrictMode } from "react";',
        'import { createRoot } from "react-dom/client";',
        'import App from "./src/App";',
        '',
        'const root = createRoot(document.getElementById("root")!);',
        'root.render(<StrictMode><App /></StrictMode>);',
      ].join('\n'),
    }
  }

  return files
}

export function ProjectFilesPanel({ files, dependencies, entryPoint }: ProjectFilesPanelProps) {
  const normalizedEntryPoint = normalizeSandpackPath(entryPoint ?? 'App.tsx')
  const resolvedFiles = useMemo(() => resolveSandpackFiles(files), [files])
  const [activeView, setActiveView] = useState<'code' | 'preview'>('preview')
  const sandpackTheme = useMemo(() => getSandpackThemeFromCss(), [])

  return (
    <SandpackProvider
      template="react-ts"
      theme={sandpackTheme}
      files={resolvedFiles}
      customSetup={{ dependencies: dependencies ?? {}, entry: normalizedEntryPoint }}
      options={{
        activeFile: normalizedEntryPoint,
        recompileMode: 'immediate',
        recompileDelay: 200,
      }}
    >
      <div className="card-glass-panel flex min-h-0 flex-1 overflow-hidden">
        <div
          className="border-border flex min-h-0 shrink-0 flex-col border-r"
          style={{ width: 220 }}
        >
          <div className="border-border flex items-center border-b px-4 py-3">
            <span className="body-2 text-foreground font-medium">FILES</span>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
            <SandpackFileExplorer autoHiddenFiles />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-border flex items-center gap-1 border-b px-4 py-3">
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeView === 'preview'
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveView('code')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeView === 'code'
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              Code
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              {activeView === 'code' ? (
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  wrapContent
                  style={{ height: '100%', width: '100%' }}
                />
              ) : (
                <SandpackRuntimePreview
                  style={{ height: '100%', width: '100%' }}
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </SandpackProvider>
  )
}
