'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react'
import {
  denormalizeSandpackPath,
  normalizeSandpackPath,
  saveProjectFile,
} from '../services/project-files.service'

interface ProjectEditorProps {
  projectId: string
  files: Record<string, string>
  dependencies?: Record<string, string>
  entryPoint?: string
  rightPanel?: ReactNode
}

function ProjectEditorCanvas({
  projectId,
  rightPanel,
}: {
  projectId: string
  rightPanel?: React.ReactNode
}) {
  const { sandpack } = useSandpack()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(sandpack.files)
      for (const [path, file] of entries) {
        await saveProjectFile(projectId, path, file.code)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm text-[var(--color-foreground)]">Edit Mode</span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="button-glass-purple rounded-lg px-3 py-1 text-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <SandpackLayout className="h-full min-h-0">
          <SandpackFileExplorer style={{ minWidth: 220, maxWidth: 280 }} />
          <SandpackCodeEditor showTabs showLineNumbers wrapContent />
          <SandpackPreview className="h-full min-h-0" showOpenInCodeSandbox={false} />
        </SandpackLayout>
      </div>
      {rightPanel ? <div className="border-border w-[360px] border-l">{rightPanel}</div> : null}
    </div>
  )
}

export function ProjectEditor({
  projectId,
  files,
  dependencies,
  entryPoint,
  rightPanel,
}: ProjectEditorProps) {
  const normalizedFiles = useMemo(() => {
    const mapped: Record<string, string> = {}
    for (const [path, content] of Object.entries(files)) {
      mapped[normalizeSandpackPath(path)] = content
    }
    return mapped
  }, [files])
  const normalizedEntryPoint = normalizeSandpackPath(entryPoint ?? 'src/App.tsx')
  const hasPackageJson = Object.prototype.hasOwnProperty.call(
    normalizedFiles,
    normalizeSandpackPath('package.json'),
  )
  if (!hasPackageJson) {
    normalizedFiles[normalizeSandpackPath('package.json')] = JSON.stringify(
      {
        name: `project-${projectId}`,
        private: true,
        version: '1.0.0',
      },
      null,
      2,
    )
  }
  const rootDeps =
    typeof normalizedFiles[normalizeSandpackPath('package.json')] === 'string'
      ? parseDeps(normalizedFiles[normalizeSandpackPath('package.json')] as string)
      : {}

  return (
    <SandpackProvider
      template="react-ts"
      files={normalizedFiles}
      customSetup={{
        dependencies: { ...rootDeps, ...(dependencies ?? {}) },
        entry: denormalizeSandpackPath(normalizedEntryPoint),
      }}
      options={{
        activeFile: normalizedEntryPoint,
        recompileMode: 'immediate',
        recompileDelay: 200,
      }}
    >
      <ProjectEditorCanvas projectId={projectId} rightPanel={rightPanel} />
    </SandpackProvider>
  )
}

function parseDeps(packageJsonContent: string): Record<string, string> {
  try {
    const parsed = JSON.parse(packageJsonContent) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) }
  } catch {
    return {}
  }
}
