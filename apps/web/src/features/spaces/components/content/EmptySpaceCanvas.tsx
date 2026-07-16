'use client'

import { LayoutGrid, MessageSquare, Plus } from 'lucide-react'
import { useSpacesStore } from '../../store/use-spaces-store'

function EmptySpaceMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="bg-muted-foreground h-spacing-32 w-spacing-32 absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-10 top-spacing-12 gap-spacing-2 p-spacing-2 absolute flex h-32 w-28 rotate-6 flex-col opacity-40 shadow-lg">
        <div className="h-spacing-2 rounded-spacing-1 border-border bg-secondary w-3/4 border" />
        <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
        <div className="h-spacing-1 bg-muted-foreground w-5/6 rounded-full opacity-15" />
        <div className="h-spacing-8 rounded-spacing-2 border-border bg-secondary mt-auto border" />
      </div>

      <div className="card-glass top-spacing-3 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 -rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted h-spacing-8 gap-spacing-2 px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <div className="border-border bg-secondary h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center border">
            <LayoutGrid className="icon-sm text-muted-foreground opacity-50" />
          </div>
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
            <div className="bg-muted-foreground h-spacing-2 w-3/5 rounded-full opacity-25" />
            <div className="bg-muted-foreground h-spacing-1.5 w-2/5 rounded-full opacity-15" />
          </div>
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex min-h-0 flex-1 flex-col">
          <div className="border-border bg-secondary gap-spacing-2 rounded-spacing-2 p-spacing-2 flex min-h-0 flex-1 flex-col border">
            <div className="bg-muted-foreground h-spacing-2 w-2/3 rounded-full opacity-20" />
            <div className="space-y-spacing-1 pt-spacing-1">
              <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-15" />
              <div className="bg-muted-foreground h-spacing-1 w-11/12 rounded-full opacity-15" />
            </div>
          </div>
          <div className="bg-primary h-spacing-2 mx-auto w-2/5 rounded-full opacity-35" />
        </div>
      </div>
    </div>
  )
}

export function EmptySpaceCanvas() {
  return (
    <div className="px-spacing-6 py-spacing-8 flex min-h-0 flex-1 flex-col items-center justify-center">
      <EmptySpaceMockup />
      <p className="title-h6 text-foreground mt-spacing-6 text-center">
        Build with ROAS, or add a view
      </p>
      <p className="body-3 text-muted-foreground mt-spacing-2 max-w-md text-center">
        Chat on the left to shape this space, or pick a view tab to get started.
      </p>
      <div className="mt-spacing-6 gap-spacing-3 flex flex-wrap items-center justify-center">
        <button
          type="button"
          onClick={() => {
            useSpacesStore.getState().setChatCollapsed(false)
          }}
          className="body-3 border-border bg-secondary text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-4 py-spacing-2 inline-flex items-center gap-2 border font-semibold transition-colors"
        >
          <MessageSquare className="icon-sm shrink-0" />
          Open chat
        </button>
        <button
          type="button"
          onClick={() => {
            useSpacesStore.getState().requestOpenAddViewCatalog()
          }}
          className="body-3 badge-glass badge-glass-purple text-foreground rounded-spacing-2 px-spacing-4 py-spacing-2 inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-90"
        >
          <Plus className="icon-sm shrink-0" />
          Add a view
        </button>
      </div>
    </div>
  )
}
