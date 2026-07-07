'use client'

import { useEffect, useMemo, useState } from 'react'
import { listGitHubRepos } from '../services/projects.service'
import type { GitHubRepoSummary } from '../types'

interface RepoImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (repoFullName: string, branch?: string) => Promise<void>
}

export function RepoImportModal({ open, onClose, onImport }: RepoImportModalProps) {
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([])
  const [selected, setSelected] = useState<string>('')
  const [branch, setBranch] = useState<string>('main')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void listGitHubRepos()
      .then((items) => {
        setRepos(items)
        if (items[0]) {
          setSelected(items[0].full_name)
          setBranch(items[0].default_branch || 'main')
        }
      })
      .finally(() => setLoading(false))
  }, [open])

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.full_name === selected) ?? null,
    [repos, selected],
  )

  const handleImport = async () => {
    if (!selected) return
    setImporting(true)
    try {
      await onImport(selected, branch.trim() || undefined)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-overlay p-4">
      <div className="surface-card border-border w-full max-w-xl rounded-2xl border p-4">
        <h3 className="title-h4 text-foreground">Import GitHub Repository</h3>
        <p className="body-3 text-muted-foreground mt-1">
          Select a connected repository and import it into Projects.
        </p>
        {loading ? (
          <p className="body-3 text-muted-foreground mt-4">Loading repositories...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <select
              value={selected}
              onChange={(event) => {
                const repoFullName = event.target.value
                setSelected(repoFullName)
                const repo = repos.find((item) => item.full_name === repoFullName)
                if (repo?.default_branch) setBranch(repo.default_branch)
              }}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
            <input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="Branch (e.g. main)"
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            />
            {selectedRepo ? (
              <p className="body-4 text-muted-foreground">
                {selectedRepo.description || 'No description'}
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral rounded-lg px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={!selected || importing}
            className="button-glass-purple rounded-lg px-3 py-1.5 text-sm"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
