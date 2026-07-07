'use client'

import { Image as ImageIcon, Lock, Type } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { DocSettingsSubpagesRow } from '../settings/DocSettingsSubpagesRow'
import { DocSettingsToggleRow } from '../settings/DocSettingsToggleRow'
import type { DocFontSize, DocFontStyle, DocSubpagesDisplayMode } from '../types/doc-editor.types'

export function DocPageSettingsSlideContent({
  docFontStyle,
  docFontSize,
  docFullWidth,
  docSubpagesDisplay,
  docShowCover,
  docShowOutline,
  docLocked,
  updateDocSetting,
}: {
  docFontStyle: DocFontStyle
  docFontSize: DocFontSize
  docFullWidth: boolean
  docSubpagesDisplay: DocSubpagesDisplayMode
  docShowCover: boolean
  docShowOutline: boolean
  docLocked: boolean
  updateDocSetting: (key: string, value: unknown) => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Font style
        </span>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'system', label: 'System', sample: 'Aa', font: 'inherit' },
              { id: 'serif', label: 'Serif', sample: 'Ss', font: 'Georgia, serif' },
              { id: 'mono', label: 'Mono', sample: '00', font: '"SF Mono", monospace' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateDocSetting('_doc_font_style', opt.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-center transition-colors',
                docFontStyle === opt.id
                  ? 'chip-glass-blue border-transparent text-[var(--foreground)]'
                  : 'border-[var(--border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]',
              )}
            >
              <span
                className="text-base font-semibold leading-none"
                style={{ fontFamily: opt.font }}
              >
                {opt.sample}
              </span>
              <span className="text-[10px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Font size
        </span>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'small', label: 'Small', sampleSize: 'text-sm' },
              { id: 'default', label: 'Default', sampleSize: 'text-base' },
              { id: 'large', label: 'Large', sampleSize: 'text-lg' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateDocSetting('_doc_font_size', opt.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-center transition-colors',
                docFontSize === opt.id
                  ? 'chip-glass-blue border-transparent'
                  : 'border-[var(--border)] hover:border-[var(--color-muted-foreground)]',
              )}
            >
              <div className="flex items-end gap-0.5 text-[var(--foreground)]">
                <span className={cn('font-semibold leading-none', opt.sampleSize)}>Aa</span>
                <div className="flex flex-col gap-[3px] pb-[3px]">
                  <div className="bg-[var(--foreground)]/35 h-[1.5px] w-3 rounded-full" />
                  <div className="bg-[var(--foreground)]/35 h-[1.5px] w-2.5 rounded-full" />
                  <div className="bg-[var(--foreground)]/35 h-[1.5px] w-2 rounded-full" />
                </div>
              </div>
              <span
                className={cn(
                  'text-[10px]',
                  docFontSize === opt.id
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)]',
                )}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Page width
        </span>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(
            [
              { id: false, label: 'Default' },
              { id: true, label: 'Full width' },
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => updateDocSetting('_doc_full_width', opt.id)}
              className={cn(
                'rounded-xl border py-2 text-center text-xs transition-colors',
                docFullWidth === opt.id
                  ? 'chip-glass-blue border-transparent text-[var(--foreground)]'
                  : 'border-[var(--border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Sections
        </span>
        <div className="mt-2">
          <DocSettingsSubpagesRow
            mode={docSubpagesDisplay}
            onChange={(next) => updateDocSetting('_doc_subpages_display', next)}
          />
        </div>
      </div>

      <div className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Display
        </span>
        <div className="mt-2 flex flex-col gap-0.5">
          <DocSettingsToggleRow
            icon={ImageIcon}
            label="Cover image"
            checked={docShowCover}
            onChange={(v) => updateDocSetting('_doc_show_cover', v)}
          />
          <DocSettingsToggleRow
            icon={Type}
            label="Page outline"
            checked={docShowOutline}
            onChange={(v) => updateDocSetting('_doc_show_outline', v)}
          />
          <DocSettingsToggleRow
            icon={Lock}
            label="Lock page"
            checked={docLocked}
            onChange={(v) => updateDocSetting('_doc_locked', v)}
          />
        </div>
      </div>
    </div>
  )
}
