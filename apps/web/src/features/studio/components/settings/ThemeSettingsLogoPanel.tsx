'use client'

import type { MutableRefObject, RefObject } from 'react'
import { Cloud, FolderOpen, HardDrive, ImagePlus, Plus, Upload } from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import type { Theme } from '@/features/themes/types'

export interface ThemeSettingsLogoPanelProps {
  selectedTheme: Theme
  logoUrl: string | null
  logoAddMenuOpen: boolean
  setLogoAddMenuOpen: (v: boolean | ((o: boolean) => boolean)) => void
  logoAddMenuRef: RefObject<HTMLDivElement | null>
  logoFileInputRef: RefObject<HTMLInputElement | null>
  logoDragDepth: MutableRefObject<number>
  isDraggingLogoFile: boolean
  setIsDraggingLogoFile: (v: boolean) => void
  setShowLogoLibraryPicker: (v: boolean) => void
  setLogoAssetId: (v: string | null) => void
  setLogoUrl: (v: string | null) => void
  uploadThemeLogoFile: (file: File) => Promise<void>
  openDrive: () => Promise<void>
  openDropbox: () => Promise<void>
}

export function ThemeSettingsLogoPanel({
  selectedTheme,
  logoUrl,
  logoAddMenuOpen,
  setLogoAddMenuOpen,
  logoAddMenuRef,
  logoFileInputRef,
  logoDragDepth,
  isDraggingLogoFile,
  setIsDraggingLogoFile,
  setShowLogoLibraryPicker,
  setLogoAssetId,
  setLogoUrl,
  uploadThemeLogoFile,
  openDrive,
  openDropbox,
}: ThemeSettingsLogoPanelProps) {
  return (
    <div>
      <div className="space-y-spacing-4 sm:space-y-spacing-6">
        <div>
          <h3 className="body-1 mb-spacing-2 font-semibold text-[var(--color-foreground)]">
            Theme Logo
          </h3>
          <p className="typo-caption mb-spacing-4 text-[var(--color-muted-foreground)]">
            Choose a logo for this theme. Funnels created with this theme will use this logo by
            default.
          </p>

          <input
            ref={logoFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadThemeLogoFile(file)
              e.target.value = ''
            }}
          />

          {logoUrl ? (
            <div className="space-y-spacing-2">
              {!selectedTheme.is_system && (
                <div className="flex justify-end">
                  <div className="relative" ref={logoAddMenuRef}>
                    <button
                      type="button"
                      onClick={() => setLogoAddMenuOpen((o) => !o)}
                      className="btn-icon-glass btn-icon-glass-sm rounded-spacing-2 flex h-9 w-9 items-center justify-center"
                      title="Add or change logo"
                      aria-expanded={logoAddMenuOpen}
                      aria-haspopup="menu"
                    >
                      <Plus className="icon-sm" />
                    </button>
                    {logoAddMenuOpen && (
                      <div
                        className="dropdown-menu-solid absolute right-0 top-full z-[60] mt-1 w-52 py-1"
                        role="menu"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowLogoLibraryPicker(true)
                            setLogoAddMenuOpen(false)
                          }}
                          className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                        >
                          <FolderOpen className="icon-sm shrink-0" />
                          From library
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            logoFileInputRef.current?.click()
                            setLogoAddMenuOpen(false)
                          }}
                          className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                        >
                          <Upload className="icon-sm shrink-0" />
                          Upload from device
                        </button>
                        <CloudAttachMenuItems
                          onDrive={() => void openDrive()}
                          onDropbox={() => void openDropbox()}
                          onSelect={() => setLogoAddMenuOpen(false)}
                          driveIcon={<HardDrive className="icon-sm shrink-0" />}
                          dropboxIcon={<Cloud className="icon-sm shrink-0" />}
                          itemClassName="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="card-glass rounded-spacing-2 p-spacing-3 sm:p-spacing-4 border border-[var(--color-border)]">
                <div className="gap-spacing-3 sm:gap-spacing-4 flex flex-col items-center sm:flex-row">
                  <div className="rounded-spacing-1 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-[var(--color-border)] bg-[var(--color-background)] sm:h-24 sm:w-24">
                    <img
                      src={logoUrl}
                      alt="Theme logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="body-3 mb-spacing-1 font-medium text-[var(--color-foreground)]">
                      Logo selected
                    </p>
                    <p className="typo-caption text-[var(--color-muted-foreground)]">
                      This logo will be used as the default for all funnels with this theme
                    </p>
                  </div>
                  {!selectedTheme.is_system && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoAssetId(null)
                        setLogoUrl(null)
                      }}
                      className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 w-full font-medium sm:w-auto"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : selectedTheme.is_system ? (
            <div className="card-glass rounded-spacing-2 p-spacing-6 sm:p-spacing-8 border border-dashed border-[var(--color-border)] text-center">
              <ImagePlus className="mb-spacing-3 mx-auto h-10 w-10 text-[var(--color-muted-foreground)] sm:h-12 sm:w-12" />
              <p className="body-3 mb-spacing-2 font-medium text-[var(--color-foreground)]">
                No logo on this system theme
              </p>
              <p className="typo-caption text-[var(--color-muted-foreground)]">
                Duplicate the theme to add a logo.
              </p>
            </div>
          ) : (
            <div className="space-y-spacing-2">
              <div className="flex justify-end">
                <div className="relative" ref={logoAddMenuRef}>
                  <button
                    type="button"
                    onClick={() => setLogoAddMenuOpen((o) => !o)}
                    className="btn-icon-glass btn-icon-glass-sm rounded-spacing-2 flex h-9 w-9 items-center justify-center"
                    title="Add logo"
                    aria-expanded={logoAddMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Plus className="icon-sm" />
                  </button>
                  {logoAddMenuOpen && (
                    <div
                      className="dropdown-menu-solid absolute right-0 top-full z-[60] mt-1 w-52 py-1"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowLogoLibraryPicker(true)
                          setLogoAddMenuOpen(false)
                        }}
                        className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <FolderOpen className="icon-sm shrink-0" />
                        From library
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          logoFileInputRef.current?.click()
                          setLogoAddMenuOpen(false)
                        }}
                        className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <Upload className="icon-sm shrink-0" />
                        Upload from device
                      </button>
                      <CloudAttachMenuItems
                        onDrive={() => void openDrive()}
                        onDropbox={() => void openDropbox()}
                        onSelect={() => setLogoAddMenuOpen(false)}
                        driveIcon={<HardDrive className="icon-sm shrink-0" />}
                        dropboxIcon={<Cloud className="icon-sm shrink-0" />}
                        itemClassName="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="card-glass rounded-spacing-2 p-spacing-6 sm:p-spacing-8 border border-dashed border-[var(--color-border)] text-center">
                <div
                  className={`gap-spacing-2 flex flex-col items-center justify-center ${isDraggingLogoFile ? 'ring-primary/40 rounded-spacing-2 ring-2' : ''}`}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    logoDragDepth.current += 1
                    setIsDraggingLogoFile(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    logoDragDepth.current -= 1
                    if (logoDragDepth.current <= 0) {
                      logoDragDepth.current = 0
                      setIsDraggingLogoFile(false)
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'copy'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    logoDragDepth.current = 0
                    setIsDraggingLogoFile(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) void uploadThemeLogoFile(file)
                  }}
                >
                  <ImagePlus className="mb-spacing-1 h-10 w-10 text-[var(--color-muted-foreground)] sm:h-12 sm:w-12" />
                  <p className="body-3 font-medium text-[var(--color-foreground)]">
                    No logo selected
                  </p>
                  <p className="typo-caption px-spacing-2 text-[var(--color-muted-foreground)]">
                    Drop an image here or use + for library, device, or cloud.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
