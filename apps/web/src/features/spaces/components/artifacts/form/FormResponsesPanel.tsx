'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { fetchFormResponses, type FormQuestion, type FormResponse } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import { resolveResponseTitle } from './form-responses-display'
import { FormResponsesList, ResponseDetailView } from './FormResponsesPanelViews'

interface FormResponsesPanelProps {
  open: boolean
  onClose: () => void
  formId: string
  questions: FormQuestion[]
}

export function FormResponsesPanel({ open, onClose, formId, questions }: FormResponsesPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchFormResponses(formId)
      .then((rows) => {
        if (!cancelled) setResponses(rows)
      })
      .catch(() => {
        if (!cancelled) setResponses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, formId])

  useEffect(() => {
    if (!open) {
      setSelectedId(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selectedId) {
        setSelectedId(null)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, selectedId])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return
      const target = event.target as Node | null
      if (!target) return
      if (panel.contains(target)) return
      if (target instanceof Element && target.closest('[data-form-responses-trigger]')) return
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [open, onClose])

  const sorted = useMemo(
    () =>
      [...responses].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
      ),
    [responses],
  )

  const selected = useMemo(
    () => (selectedId ? (sorted.find((row) => row.id === selectedId) ?? null) : null),
    [selectedId, sorted],
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="form-responses-slide"
          className="pointer-events-none absolute inset-0 z-40 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.aside
            ref={panelRef}
            className={cn(
              'pointer-events-auto flex h-full w-[460px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border bg-background shadow-2xl',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            role="dialog"
            aria-label="Form responses"
          >
            <header className="border-border h-spacing-12 px-spacing-4 flex shrink-0 items-center justify-between border-b">
              <div className="gap-spacing-2 flex min-w-0 items-center">
                {selected ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-7 w-spacing-7 rounded-spacing-2 inline-flex items-center justify-center transition-colors"
                    aria-label="Back to responses list"
                    title="Back to responses"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <h2 className="title-h6 text-foreground min-w-0 truncate">
                  {selected
                    ? resolveResponseTitle(
                        selected.answers ?? {},
                        questions,
                        selected.submitter_email ?? null,
                      )
                    : 'Responses'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare"
                aria-label="Close responses"
              >
                <X className="icon-xs" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-spacing-4 py-spacing-6 body-3 text-muted-foreground text-center">
                  Loading responses…
                </p>
              ) : selected ? (
                <ResponseDetailView response={selected} questions={questions} />
              ) : (
                <FormResponsesList
                  responses={sorted}
                  questions={questions}
                  onSelectResponse={setSelectedId}
                />
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
