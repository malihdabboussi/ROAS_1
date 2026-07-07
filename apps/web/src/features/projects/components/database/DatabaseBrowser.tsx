'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Table2, Users } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { listTables } from '../../services/supabase-integration.service'
import type { ProjectRepo, TableInfo } from '../../types'
import { DatabaseAuthPanel } from './DatabaseAuthPanel'
import { DatabaseTableTree } from './DatabaseTableTree'
import { DatabaseTableView } from './DatabaseTableView'

type BrowserTab = 'tables' | 'auth'

interface DatabaseBrowserProps {
  project: ProjectRepo
}

export function DatabaseBrowser({ project }: DatabaseBrowserProps) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<BrowserTab>('tables')

  const projectRef = project.supabase_project_ref!

  const loadTables = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listTables(projectRef)
      setTables(result)
    } catch {
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [projectRef])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  const selectedTableInfo = tables.find((t) => t.name === selectedTable)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="px-spacing-3 py-spacing-1 border-border flex items-center justify-between border-b">
        <div className="gap-spacing-2 flex items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`gap-spacing-1 flex items-center rounded-md px-2 py-1 text-xs font-medium transition-all ${
                activeTab === 'tables'
                  ? 'chip-glass-blue text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle'
              }`}
            >
              <Table2 className="h-3 w-3" />
              Tables
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auth')}
              className={`gap-spacing-1 flex items-center rounded-md px-2 py-1 text-xs font-medium transition-all ${
                activeTab === 'auth'
                  ? 'chip-glass-blue text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle'
              }`}
            >
              <Users className="h-3 w-3" />
              Auth
            </button>
          </div>
          <span className="typo-caption text-muted-foreground/60">·</span>
          <span className="body-4 text-muted-foreground truncate">
            {project.supabase_project_name}
          </span>
        </div>
        <a
          href={`https://supabase.com/dashboard/project/${projectRef}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          title="Open in Supabase Dashboard"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Tab content */}
      {activeTab === 'auth' ? (
        <DatabaseAuthPanel projectRef={projectRef} />
      ) : loading && tables.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <VibeyLoadingOrb text="Loading database..." state="processing" size="lg" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="border-border flex min-h-0 shrink-0 flex-col border-r"
            style={{ width: 220 }}
          >
            <DatabaseTableTree
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onRefresh={loadTables}
              loading={loading}
            />
          </div>
          <div className="min-h-0 flex-1">
            <DatabaseTableView
              projectRef={projectRef}
              tableName={selectedTable}
              columns={selectedTableInfo?.columns ?? []}
              onRowCountChanged={loadTables}
            />
          </div>
        </div>
      )}
    </div>
  )
}
