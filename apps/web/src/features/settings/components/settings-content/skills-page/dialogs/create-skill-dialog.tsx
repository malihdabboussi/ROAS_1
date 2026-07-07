'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Plus, Upload, X } from 'lucide-react'
import { DraftResourceTree } from '../draft-resource-tree'
import type { DraftResource, ResourceTreeNode } from '../skills-page.types'
import { toSkillKey } from '../skills-page.utils'

export function CreateSkillDialog({
  createOpen,
  creating,
  setCreateOpen,
  resetCreateDialog,
  draftName,
  setDraftName,
  draftDescription,
  setDraftDescription,
  draftMarkdown,
  setDraftMarkdown,
  draftResources,
  setDraftResources,
  draftSelectedResourceId,
  setDraftSelectedResourceId,
  draftExpandedFolders,
  setDraftExpandedFolders,
  draftResourceTree,
  createError,
  draftAddFilesOpen,
  setDraftAddFilesOpen,
  addingRefName,
  setAddingRefName,
  addRefInputRef,
  assetInputRef,
  startAddReference,
  commitAddReference,
  handleAddAssetFiles,
  handleDeleteDraftResource,
  handleCreateSkill,
}: {
  createOpen: boolean
  creating: boolean
  setCreateOpen: Dispatch<SetStateAction<boolean>>
  resetCreateDialog: () => void
  draftName: string
  setDraftName: Dispatch<SetStateAction<string>>
  draftDescription: string
  setDraftDescription: Dispatch<SetStateAction<string>>
  draftMarkdown: string
  setDraftMarkdown: Dispatch<SetStateAction<string>>
  draftResources: DraftResource[]
  setDraftResources: Dispatch<SetStateAction<DraftResource[]>>
  draftSelectedResourceId: string | null
  setDraftSelectedResourceId: Dispatch<SetStateAction<string | null>>
  draftExpandedFolders: Set<string>
  setDraftExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  draftResourceTree: ResourceTreeNode[]
  createError: string | null
  draftAddFilesOpen: boolean
  setDraftAddFilesOpen: Dispatch<SetStateAction<boolean>>
  addingRefName: string | null
  setAddingRefName: Dispatch<SetStateAction<string | null>>
  addRefInputRef: RefObject<HTMLInputElement | null>
  assetInputRef: RefObject<HTMLInputElement | null>
  startAddReference: () => void
  commitAddReference: () => void
  handleAddAssetFiles: (files: FileList | File[]) => void
  handleDeleteDraftResource: (id: string) => void
  handleCreateSkill: () => void | Promise<void>
}) {
  const draftSelectedResource = draftResources.find((r) => r.id === draftSelectedResourceId) ?? null

  return (
    <DialogPrimitive.Root
      open={createOpen}
      onOpenChange={(open) => {
        if (!open && !creating) {
          setCreateOpen(false)
          resetCreateDialog()
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setCreateOpen(false)
              resetCreateDialog()
            }
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Create skill</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex h-[70vh] max-h-[90vh] w-full max-w-5xl flex-col border bg-[var(--color-background)] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border modal-scroll-header-edge gap-spacing-3 px-spacing-4 py-spacing-3 flex shrink-0 items-start justify-between border-b">
              <div className="gap-spacing-2 flex min-w-0 flex-1 flex-col">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Skill name"
                  className="title-h6 text-foreground w-full bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <p className="body-4 text-muted-foreground font-mono">
                  {toSkillKey(draftName) || 'skill-key'}
                </p>
                <input
                  type="text"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="Short description (trigger text for the agent)"
                  className="body-3 text-muted-foreground w-full bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
              <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="btn-icon-bare shrink-0"
                    aria-label="Close"
                    disabled={creating}
                  >
                    <X className="icon-sm" />
                  </button>
              </DialogPrimitive.Close>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <div className="border-border gap-spacing-1 p-spacing-3 flex max-h-[40vh] shrink-0 flex-col overflow-y-auto border-b md:max-h-none md:w-52 md:border-b-0 md:border-r">
                <button
                  type="button"
                  onClick={() => setDraftSelectedResourceId(null)}
                  className={`body-3 rounded-spacing-2 px-spacing-2 py-spacing-2 text-left ${
                    draftSelectedResourceId === null ? 'chip-glass-blue' : 'hover:bg-white/5'
                  }`}
                >
                  SKILL.md
                </button>
                {draftResourceTree.length > 0 ? (
                  <DraftResourceTree
                    nodes={draftResourceTree}
                    expandedFolders={draftExpandedFolders}
                    setExpandedFolders={setDraftExpandedFolders}
                    selectedResourceId={draftSelectedResourceId}
                    setSelectedResourceId={setDraftSelectedResourceId}
                    onDeleteResource={handleDeleteDraftResource}
                  />
                ) : null}
                {addingRefName !== null ? (
                  <div className="mt-spacing-1">
                    <input
                      ref={addRefInputRef}
                      type="text"
                      value={addingRefName}
                      onChange={(e) => setAddingRefName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitAddReference()
                        if (e.key === 'Escape') setAddingRefName(null)
                      }}
                      onBlur={commitAddReference}
                      placeholder="references/file.md"
                      className="body-4 text-foreground placeholder:text-muted-foreground border-border rounded-spacing-1 w-full border bg-transparent px-1.5 py-0.5 outline-none focus:border-white/30"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startAddReference}
                    className="body-4 text-muted-foreground hover:text-foreground gap-spacing-1 mt-spacing-1 flex items-center transition-colors"
                  >
                    <Plus className="icon-xs" />
                    Add reference
                  </button>
                )}
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="px-spacing-4 pt-spacing-3 pb-spacing-1 flex shrink-0 items-center justify-between">
                  <p className="body-4 text-muted-foreground uppercase tracking-wide">
                    {draftSelectedResource ? 'Reference' : 'Instructions'}
                  </p>
                  {draftSelectedResourceId !== null ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDraftAddFilesOpen((o) => !o)}
                        className="body-4 text-muted-foreground hover:text-foreground gap-spacing-1 flex items-center transition-colors"
                      >
                        <Plus className="icon-xs" />
                        Add files
                      </button>
                      {draftAddFilesOpen ? (
                        <>
                          <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => setDraftAddFilesOpen(false)}
                          />
                          <div className="dropdown-glass absolute right-0 top-full z-[70] mt-1 min-w-[180px] py-1">
                            <button
                              type="button"
                              onClick={() => assetInputRef.current?.click()}
                              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                            >
                              <Upload className="text-muted-foreground icon-sm shrink-0" />
                              Upload files
                            </button>
                          </div>
                        </>
                      ) : null}
                      <input
                        ref={assetInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.json,.md,.txt,.yaml,.yml"
                        onChange={(e) => {
                          if (e.target.files?.length) handleAddAssetFiles(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="px-spacing-4 pb-spacing-4 min-h-0 flex-1 overflow-y-auto">
                  {draftSelectedResource ? (
                    draftSelectedResource.file ? (
                      <div className="gap-spacing-2 flex flex-col">
                        <p className="body-3 text-muted-foreground font-mono">
                          {draftSelectedResource.file.name}
                        </p>
                        <p className="body-4 text-muted-foreground">
                          {draftSelectedResource.content_type} &middot;{' '}
                          {(draftSelectedResource.file.size / 1024).toFixed(1)} KB
                        </p>
                        {draftSelectedResource.content_type?.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(draftSelectedResource.file)}
                            alt={draftSelectedResource.file_path}
                            className="border-border rounded-spacing-2 max-h-[min(50vh,400px)] w-auto max-w-full border object-contain"
                          />
                        ) : null}
                      </div>
                    ) : (
                      <textarea
                        value={draftSelectedResource.content ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setDraftResources((prev) =>
                            prev.map((r) =>
                              r.id === draftSelectedResourceId ? { ...r, content: val } : r,
                            ),
                          )
                        }}
                        placeholder="Reference content..."
                        className="body-3 text-foreground placeholder:text-muted-foreground h-full min-h-[300px] w-full resize-none bg-transparent font-mono outline-none"
                      />
                    )
                  ) : (
                    <textarea
                      value={draftMarkdown}
                      onChange={(e) => setDraftMarkdown(e.target.value)}
                      placeholder="Write skill instructions in markdown..."
                      className="body-3 text-foreground placeholder:text-muted-foreground h-full min-h-[300px] w-full resize-none bg-transparent font-mono outline-none"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="border-border px-spacing-4 py-spacing-3 gap-spacing-2 flex shrink-0 items-center justify-between border-t">
              <div>
                {createError ? <p className="body-4 text-destructive">{createError}</p> : null}
              </div>
              <div className="gap-spacing-2 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!creating) {
                      setCreateOpen(false)
                      resetCreateDialog()
                    }
                  }}
                  disabled={creating}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateSkill()}
                  disabled={creating || !draftName.trim()}
                  className="chip-glass-blue rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create Skill'}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
