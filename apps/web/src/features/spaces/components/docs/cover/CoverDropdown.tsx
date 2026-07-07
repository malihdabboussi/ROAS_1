'use client'

import React, { forwardRef } from 'react'
import { Bot, Image as ImageIcon, Upload } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export const CoverDropdown = forwardRef<
  HTMLDivElement,
  {
    className?: string
    onUpload: () => void
    onLibrary: () => void
    onGenerate: () => void
  }
>(({ className, onUpload, onLibrary, onGenerate }, ref) => (
  <div
    ref={ref}
    className={cn(
      'dropdown-menu-solid absolute z-[280] w-44 overflow-hidden rounded-xl py-1 shadow-xl',
      className ?? 'left-0 top-full mt-1',
    )}
  >
    <button
      type="button"
      onClick={onUpload}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <Upload className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
      Upload
    </button>
    <button
      type="button"
      onClick={onLibrary}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <ImageIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
      Media library
    </button>
    <div className="my-0.5 border-t border-[var(--border)]" />
    <button
      type="button"
      onClick={onGenerate}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <Bot className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
      Generate with AI
    </button>
  </div>
))
CoverDropdown.displayName = 'CoverDropdown'
