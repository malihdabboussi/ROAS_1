'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils/cn'

type TabsListVariant = 'default' | 'glass' | 'liquid' | 'full'

const TabsListVariantContext = React.createContext<TabsListVariant>('default')

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = 'liquid',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsListVariant
}) {
  return (
    <TabsListVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          'text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
          variant === 'default' && 'surface-card border-border border',
          variant === 'glass' && 'tabs-glass',
          variant === 'liquid' && 'tabs-liquid-glass',
          variant === 'full' && 'tabs-full',
          className,
        )}
        {...props}
      />
    </TabsListVariantContext.Provider>
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const listVariant = React.useContext(TabsListVariantContext)
  const usesGlassShell =
    listVariant === 'liquid' || listVariant === 'full' || listVariant === 'glass'

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
        usesGlassShell
          ? 'data-[state=active]:border-transparent data-[state=active]:shadow-none'
          : 'data-[state=active]:surface-bg data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('outline-none data-[state=inactive]:hidden', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
