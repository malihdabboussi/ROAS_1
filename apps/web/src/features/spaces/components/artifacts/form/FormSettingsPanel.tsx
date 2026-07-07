'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Form, FormSettings } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import { FormSettingsColorsSection } from './FormSettingsColorsSection'
import { FormSettingsLayoutSection } from './FormSettingsLayoutSection'
import { FormSettingsSubmissionSections } from './FormSettingsSubmissionSections'
import { useFormBindToSpace } from './use-form-bind-to-space'

interface FormSettingsPanelProps {
  open: boolean
  onClose: () => void
  form: Pick<Form, 'id' | 'name' | 'campaign_id' | 'settings' | 'schema'>
  settings: FormSettings
  onChange: (settings: FormSettings) => void
}

export function FormSettingsPanel({
  open,
  onClose,
  form,
  settings,
  onChange,
}: FormSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const roster = useSpacesStore((state) => state.roster)
  const currentUserId = useSpacesStore((state) => state.currentUserId)
  const bindToSpace = useFormBindToSpace({
    form: { id: form.id, name: form.name, settings },
    onSettingsChange: onChange,
  })

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return
      const target = event.target as Node | null
      if (!target) return
      if (panel.contains(target)) return
      if (target instanceof Element) {
        if (target.closest('[data-form-settings-trigger]')) return
        // Picker / popover portals render outside the panel DOM tree; treat them as part of the panel.
        if (target.closest('[data-form-color-picker]')) return
      }
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [open, onClose])

  const update = (patch: Partial<FormSettings>) => onChange({ ...settings, ...patch })

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="form-settings-slide"
          className="pointer-events-none absolute inset-0 z-40 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.aside
            ref={panelRef}
            className={cn(
              'pointer-events-auto flex h-full w-[360px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border bg-background shadow-2xl',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            role="dialog"
            aria-label="Form settings"
          >
            <header className="border-border h-spacing-12 px-spacing-4 flex shrink-0 items-center justify-between border-b">
              <h2 className="title-h6 text-foreground">Settings</h2>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare"
                aria-label="Close settings"
              >
                <X className="icon-xs" />
              </button>
            </header>

            <div className="space-y-spacing-5 p-spacing-4 flex-1 overflow-y-auto">
              <FormSettingsSubmissionSections
                form={form}
                settings={settings}
                update={update}
                roster={roster}
                currentUserId={currentUserId}
                bindToSpace={bindToSpace}
              />
              <FormSettingsLayoutSection settings={settings} update={update} />
              <FormSettingsColorsSection settings={settings} update={update} />
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
