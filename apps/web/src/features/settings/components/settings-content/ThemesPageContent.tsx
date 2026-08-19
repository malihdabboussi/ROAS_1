'use client'

import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore, Copy, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { ThemeEditorDialog } from '@/features/themes/components/ThemeEditorDialog'
import {
  createTheme,
  deleteTheme,
  listThemes,
  updateTheme,
} from '@/features/themes/services/themes.service'
import type { Theme } from '@/features/themes/types'
import { SETTINGS_TOAST_ERRORS } from '../../config/settings-toast-errors.config'

const DEFAULT_COLORS = {
  primary: '#10B981',
  primaryForeground: '#000000',
  secondaryAccent1: '#7AF0FF',
  secondaryAccent2: '#120336',
  heading: '#161616',
  body: '#666666',
  pageBackground: '#FAF9F6',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  input: '#F2F2F2',
}

type ThemeType = 'my-themes' | 'standard' | 'archived'

export default function ThemesPageContent() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [themeType, setThemeType] = useState<ThemeType>('my-themes')
  const [searchValue, setSearchValue] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<Theme | undefined>(undefined)

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    setIsLoading(true)
    try {
      const data = await listThemes()
      setThemes(data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const existingUser = themes.filter((t) => !t.is_system)
      const num = existingUser.length + 1
      const theme = await createTheme({
        name: `My Theme ${num}`,
        colors: DEFAULT_COLORS,
        status: 'draft',
      })
      setThemes((prev) => [theme, ...prev])
      setSelectedTheme(theme)
      setShowEditor(true)
    } catch {
      // silent
    }
  }

  const handleEdit = (theme: Theme) => {
    setSelectedTheme(theme)
    setShowEditor(true)
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setSelectedTheme(undefined)
  }

  const handleEditorSave = () => {
    loadThemes()
  }

  const handleDelete = async (theme: Theme) => {
    if (theme.is_system) return
    if (!confirm(`Delete theme "${theme.name}"? This cannot be undone.`)) return
    try {
      await deleteTheme(theme.id)
      setThemes((prev) => prev.filter((t) => t.id !== theme.id))
    } catch {
      // silent
    }
  }

  const handleDuplicate = async (theme: Theme) => {
    try {
      const newTheme = await createTheme({
        name: `${theme.name} (Copy)`,
        colors: theme.colors as unknown as Record<string, string>,
        status: 'complete',
      })
      setThemes((prev) => [newTheme, ...prev])
    } catch {
      // silent
    }
  }

  const handleArchive = async (theme: Theme) => {
    try {
      await updateTheme(theme.id, { status: 'archived' })
      await loadThemes()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : SETTINGS_TOAST_ERRORS.THEME_ARCHIVE_FAILED.userMessage,
      )
    }
  }

  const handleRestore = async (theme: Theme) => {
    try {
      await updateTheme(theme.id, { status: 'complete' })
      await loadThemes()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : SETTINGS_TOAST_ERRORS.THEME_RESTORE_FAILED.userMessage,
      )
    }
  }

  const extractHex = (val: string): string => {
    if (val?.includes?.('gradient')) {
      const m = val.match(/#[0-9A-Fa-f]{6}/)
      return m ? m[0] : '#888888'
    }
    return val || '#888888'
  }

  // Filter
  let filtered = themes
  if (themeType === 'my-themes')
    filtered = filtered.filter((t) => !t.is_system && t.status !== 'archived')
  else if (themeType === 'standard') filtered = filtered.filter((t) => t.is_system)
  else if (themeType === 'archived') filtered = filtered.filter((t) => t.status === 'archived')

  if (searchValue) {
    filtered = filtered.filter((t) => t.name.toLowerCase().includes(searchValue.toLowerCase()))
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="border-muted-foreground h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-spacing-4 p-spacing-4 sm:p-spacing-8">
      {/* Toolbar */}
      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        {/* Type filter tabs */}
        <div className="rounded-spacing-2 border-border flex overflow-hidden border">
          {[
            { id: 'my-themes' as ThemeType, label: 'My Themes' },
            { id: 'standard' as ThemeType, label: 'Standard' },
            { id: 'archived' as ThemeType, label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setThemeType(tab.id)}
              className={`px-spacing-3 py-spacing-2 body-3 font-medium transition-colors ${
                themeType === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-[var(--color-hover-subtle)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="gap-spacing-2 flex items-center">
          {/* Search */}
          {isSearchExpanded ? (
            <div className="gap-spacing-1 border-border rounded-spacing-2 px-spacing-2 flex items-center border">
              <Search className="text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search themes..."
                className="body-3 py-spacing-2 text-foreground placeholder:text-muted-foreground w-40 bg-transparent outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchValue('')
                  setIsSearchExpanded(false)
                }}
                className="p-1"
              >
                <X className="text-muted-foreground h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchExpanded(true)}
              className="button-glass-neutral p-spacing-2 rounded-spacing-2"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* Create */}
          <button
            onClick={handleCreate}
            className="button-glass-accent px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 gap-spacing-1 flex items-center font-medium"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Theme</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="border-border rounded-spacing-3 p-spacing-12 flex flex-col items-center justify-center border border-dashed text-center">
          <h3 className="body-1 text-foreground mb-spacing-2 font-medium">
            {searchValue
              ? 'No themes found'
              : `No ${themeType === 'my-themes' ? 'custom' : themeType} themes yet`}
          </h3>
          <p className="body-2 text-muted-foreground max-w-md">
            {searchValue
              ? 'Try adjusting your search terms'
              : themeType === 'my-themes'
                ? 'Create your first custom theme to personalize your funnel pages.'
                : 'No themes available in this category.'}
          </p>
        </div>
      ) : (
        <div className="gap-spacing-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((theme) => (
            <div
              key={theme.id}
              className="card-glass border-border rounded-spacing-3 hover:border-primary/40 group cursor-pointer overflow-hidden border transition-all"
              onClick={() => handleEdit(theme)}
            >
              {/* Color preview */}
              <div className="grid h-24 grid-cols-4 gap-px">
                <div style={{ background: theme.colors.primary }} />
                <div style={{ background: theme.colors.secondaryAccent1 }} />
                <div
                  style={{ background: theme.colors.pageBackground }}
                  className="border-border/20 border-r"
                />
                <div style={{ background: theme.colors.cardBackground }} />
              </div>

              {/* Info + actions */}
              <div className="p-spacing-3">
                <div className="gap-spacing-2 flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="body-3 text-foreground truncate font-medium">{theme.name}</p>
                    <p className="typo-caption text-muted-foreground">
                      {theme.is_system ? 'System' : theme.status === 'draft' ? 'Draft' : 'Custom'}
                      {theme.font_heading && ` · ${theme.font_heading}`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="gap-spacing-1 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip label="Duplicate">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(theme)
                        }}
                        className="rounded-spacing-1 text-muted-foreground hover:text-foreground p-1.5 hover:bg-[var(--color-hover-subtle)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    {!theme.is_system && theme.status !== 'archived' && (
                      <Tooltip label="Archive">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchive(theme)
                          }}
                          className="rounded-spacing-1 text-muted-foreground hover:text-foreground p-1.5 hover:bg-[var(--color-hover-subtle)]"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    {theme.status === 'archived' && (
                      <Tooltip label="Restore">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestore(theme)
                          }}
                          className="rounded-spacing-1 text-muted-foreground hover:text-foreground p-1.5 hover:bg-[var(--color-hover-subtle)]"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    {!theme.is_system && (
                      <Tooltip label="Delete">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(theme)
                          }}
                          className="rounded-spacing-1 text-muted-foreground hover:text-destructive p-1.5 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Color dots row */}
                <div className="gap-spacing-1 mt-spacing-2 flex">
                  {[
                    theme.colors.primary,
                    theme.colors.secondaryAccent1,
                    theme.colors.secondaryAccent2,
                    theme.colors.heading,
                    theme.colors.body,
                  ].map((color, i) => (
                    <div
                      key={i}
                      className="border-border h-4 w-4 rounded-full border"
                      style={{ background: extractHex(color) }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Theme Editor Dialog */}
      <ThemeEditorDialog
        open={showEditor}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
        theme={selectedTheme}
      />
    </div>
  )
}
