'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, Clock3, MousePointer2, Workflow, Zap } from 'lucide-react'

export function FlowEmptyState({
  mockup,
  title,
  description,
}: {
  mockup: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-spacing-8 flex min-h-0 flex-1 items-center justify-center text-center">
      <div className="gap-spacing-6 flex max-w-sm flex-col items-center">
        {mockup}
        <div className="space-y-spacing-1">
          <p className="title-h6 text-foreground">{title}</p>
          <p className="body-3 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function FlowBrowseTemplatesMockup() {
  return (
    <div aria-hidden className="relative h-spacing-48 w-spacing-80 select-none">
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-spacing-36 w-spacing-60 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted px-spacing-2 py-spacing-1 gap-spacing-1 flex items-center border-b opacity-80">
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground ml-spacing-2 h-spacing-1-5 w-1/2 rounded-full opacity-10" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 grid flex-1 grid-cols-2">
          {[Workflow, Zap, Clock3, CheckCircle2].map((Icon, index) => (
            <div
              key={index}
              className="border-border bg-secondary rounded-spacing-2 gap-spacing-2 flex flex-col border p-spacing-2"
            >
              <div className="bg-background border-border h-spacing-8 w-spacing-8 rounded-spacing-2 flex items-center justify-center border">
                <Icon className="icon-sm text-muted-foreground opacity-60" />
              </div>
              <div className="space-y-spacing-1 mt-auto">
                <div className="bg-muted-foreground h-spacing-1-5 w-full rounded-full opacity-18" />
                <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-12" />
              </div>
            </div>
          ))}
        </div>
        <div className="bottom-spacing-4 right-spacing-5 absolute rotate-12">
          <MousePointer2 className="icon-sm text-foreground drop-shadow-lg" />
        </div>
      </div>
    </div>
  )
}

export function FlowHistoryRunsMockup() {
  return (
    <div aria-hidden className="relative h-spacing-48 w-spacing-80 select-none">
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-spacing-36 w-spacing-60 -translate-x-1/2 -rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center border-b opacity-80">
          <Clock3 className="icon-sm text-muted-foreground opacity-60" />
          <div className="bg-muted-foreground h-spacing-2 w-1/2 rounded-full opacity-16" />
        </div>
        <div className="p-spacing-3 gap-spacing-2 flex flex-1 flex-col">
          {[CheckCircle2, Workflow, Zap].map((Icon, index) => (
            <div
              key={index}
              className="border-border bg-secondary rounded-spacing-2 gap-spacing-2 flex items-center border p-spacing-2"
            >
              <div className="bg-background border-border h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center border">
                <Icon className="icon-sm text-muted-foreground opacity-65" />
              </div>
              <div className="space-y-spacing-1 min-w-0 flex-1">
                <div className="bg-muted-foreground h-spacing-2 w-3/4 rounded-full opacity-18" />
                <div className="bg-muted-foreground h-spacing-1 w-1/2 rounded-full opacity-12" />
              </div>
              <div className="bg-success h-spacing-2 w-spacing-2 rounded-full opacity-60" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-border bg-card left-spacing-8 top-spacing-14 absolute h-spacing-24 border-l opacity-50" />
    </div>
  )
}

export function FlowManageFlowsMockup() {
  return (
    <div aria-hidden className="relative h-spacing-48 w-spacing-80 select-none">
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-spacing-36 w-spacing-60 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center border-b opacity-80">
          <Workflow className="icon-sm text-muted-foreground opacity-60" />
          <div className="bg-muted-foreground h-spacing-2 w-1/3 rounded-full opacity-18" />
          <div className="bg-primary ml-auto h-spacing-4 w-spacing-20 rounded-full opacity-35" />
        </div>
        <div className="p-spacing-3 gap-spacing-2 flex flex-1 flex-col">
          {[Workflow, Zap, CheckCircle2].map((Icon, index) => (
            <div
              key={index}
              className="border-border bg-secondary rounded-spacing-2 gap-spacing-2 flex items-center border p-spacing-2"
            >
              <div className="bg-background border-border h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center border">
                <Icon className="icon-sm text-muted-foreground opacity-65" />
              </div>
              <div className="space-y-spacing-1 min-w-0 flex-1">
                <div className="bg-muted-foreground h-spacing-2 w-3/4 rounded-full opacity-18" />
                <div className="bg-muted-foreground h-spacing-1 w-1/2 rounded-full opacity-12" />
              </div>
              <div className="badge-glass badge-glass-muted h-spacing-4 w-spacing-10 rounded-full opacity-70" />
            </div>
          ))}
        </div>
        <div className="bottom-spacing-4 right-spacing-5 absolute rotate-12">
          <MousePointer2 className="icon-sm text-foreground drop-shadow-lg" />
        </div>
      </div>
    </div>
  )
}
