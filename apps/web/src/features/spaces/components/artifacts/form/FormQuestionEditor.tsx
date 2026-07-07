import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Eye, EyeOff, Link2, Trash2 } from 'lucide-react'
import { fetchSpaceById } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { FieldDef, Space, SpaceSchema } from '@/features/spaces/types'
import type { FormQuestion } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import {
  applyFieldBindingToQuestion,
  defaultFormSelectOptions,
  fieldTypeForQuestion,
} from './form-field-binding'
import { FormContactSubfieldsEditor } from './FormContactSubfieldsEditor'
import { FormFieldBindSubmenu } from './FormFieldBindSubmenu'
import { FormOptionListEditor } from './FormOptionListEditor'
import { QuestionDisplay } from './FormQuestionPreview'
import { FORM_QUESTION_TYPES } from './FormQuestionTypePicker'

const BIND_MENU_WIDTH_PX = 320
const BIND_MENU_VIEWPORT_PADDING_PX = 12

export function FormQuestionEditor({
  question,
  onChange,
  onDelete,
  targetSpaceId,
  onOpenSettings,
  variant = 'default',
}: {
  question: FormQuestion
  onChange: (next: FormQuestion) => void
  onDelete: () => void
  targetSpaceId?: string | null
  onOpenSettings?: () => void
  /** `rail`: always-editing, no card chrome, no outside-click close. Used inside the right rail panel. */
  variant?: 'default' | 'rail'
}) {
  const isRail = variant === 'rail'
  const rootRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(isRail)
  const options = question.options ?? []
  const showOptions = question.type === 'single_select' || question.type === 'multi_select'
  const spaces = useSpacesStore((state) => state.spaces)
  const [space, setSpace] = useState<Space | null>(null)
  const [bindOpen, setBindOpen] = useState(false)
  const [bindPos, setBindPos] = useState<{ top: number; left: number } | null>(null)
  const bindButtonRef = useRef<HTMLButtonElement>(null)
  const bindPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!targetSpaceId) {
      setSpace(null)
      return
    }
    const local = spaces.find((candidate) => candidate.id === targetSpaceId)
    if (local) {
      setSpace(local)
      return
    }
    fetchSpaceById(targetSpaceId)
      .then((row) => {
        if (!cancelled) setSpace(row)
      })
      .catch(() => {
        if (!cancelled) setSpace(null)
      })
    return () => {
      cancelled = true
    }
  }, [targetSpaceId, spaces])

  useEffect(() => {
    if (!bindOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (target.closest('[data-form-field-bind-popover]')) return
      if (bindButtonRef.current?.contains(target)) return
      setBindOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [bindOpen])

  useLayoutEffect(() => {
    if (question.type !== 'single_select' && question.type !== 'multi_select') return
    const len = question.options?.length ?? 0
    if (len > 0) return
    onChange({ ...question, options: defaultFormSelectOptions() })
  }, [question.id, question.type, question.options?.length, onChange, question])

  useEffect(() => {
    if (!editing || isRail) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (target.closest('[data-form-field-bind-popover]')) return
      setEditing(false)
      setBindOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [editing, isRail])

  const boundField = useMemo((): FieldDef | null => {
    if (!question.property_field_id || !space) return null
    const schema = space.schema as SpaceSchema
    return schema.fields.find((field) => field.id === question.property_field_id) ?? null
  }, [question.property_field_id, space])
  const canBind = Boolean(fieldTypeForQuestion(question.type))
  const typeMeta = FORM_QUESTION_TYPES.find((item) => item.type === question.type)
  const TypeIcon = typeMeta?.icon

  const placeBindMenu = useCallback(() => {
    const trigger = bindButtonRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const popover = bindPopoverRef.current
    const popW = popover?.offsetWidth ?? BIND_MENU_WIDTH_PX
    const popH = popover?.offsetHeight ?? 0
    const viewW = window.innerWidth
    const viewH = window.innerHeight

    let left = rect.left
    if (left + popW > viewW - BIND_MENU_VIEWPORT_PADDING_PX) {
      left = rect.right - popW
    }
    if (left < BIND_MENU_VIEWPORT_PADDING_PX) left = BIND_MENU_VIEWPORT_PADDING_PX

    let top = rect.bottom + 4
    if (popH > 0 && top + popH > viewH - BIND_MENU_VIEWPORT_PADDING_PX) {
      const above = rect.top - popH - 4
      if (above >= BIND_MENU_VIEWPORT_PADDING_PX) {
        top = above
      } else {
        top = Math.max(BIND_MENU_VIEWPORT_PADDING_PX, viewH - popH - BIND_MENU_VIEWPORT_PADDING_PX)
      }
    }

    setBindPos({ top, left })
  }, [])

  const openBindMenu = () => {
    if (bindOpen) {
      setBindOpen(false)
      return
    }
    placeBindMenu()
    setBindOpen(true)
  }

  useLayoutEffect(() => {
    if (!bindOpen) return
    placeBindMenu()
    const handle = () => placeBindMenu()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [bindOpen, placeBindMenu])

  return (
    <div
      ref={rootRef}
      className={cn(
        'rounded-spacing-3 transition-colors',
        isRail
          ? 'border border-transparent'
          : editing
            ? 'surface-card border-border border'
            : 'hover:bg-hover-subtle cursor-pointer border border-transparent',
      )}
      onClick={() => {
        if (!editing && !isRail) setEditing(true)
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div
            key="edit"
            className={cn('space-y-spacing-3 relative', isRail ? 'p-0' : 'p-spacing-4')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="gap-spacing-3 flex items-center justify-between">
              <div className="gap-spacing-2 flex min-w-0 items-center">
                {TypeIcon ? <TypeIcon className="icon-sm text-muted-foreground shrink-0" /> : null}
                <span className="body-3 text-foreground font-medium">
                  {typeMeta?.label ?? question.type}
                </span>
                {question.hidden ? (
                  <span
                    className="text-muted-foreground inline-flex shrink-0"
                    title="Hidden from form"
                    role="img"
                    aria-label="Hidden from form"
                  >
                    <EyeOff className="icon-xs" aria-hidden />
                  </span>
                ) : null}
              </div>
              <div className="gap-spacing-1 flex shrink-0 items-center">
                {canBind ? (
                  <button
                    ref={bindButtonRef}
                    type="button"
                    onClick={openBindMenu}
                    className={cn(
                      'h-spacing-7 w-spacing-7 rounded-spacing-2 text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors',
                      boundField && 'text-success hover:text-success',
                    )}
                    aria-label={
                      boundField ? `Bound to ${boundField.name}` : 'Choose response field'
                    }
                    title={boundField ? `Bound to ${boundField.name}` : 'Choose response field'}
                  >
                    <Link2 className="icon-sm" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onChange({ ...question, hidden: !question.hidden })}
                  className="h-spacing-7 w-spacing-7 rounded-spacing-2 text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
                  aria-label={question.hidden ? 'Show field in form' : 'Hide field from form'}
                  title={question.hidden ? 'Show field in form' : 'Hide field from form'}
                >
                  {question.hidden ? <EyeOff className="icon-sm" /> : <Eye className="icon-sm" />}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="h-spacing-7 w-spacing-7 rounded-spacing-2 text-muted-foreground hover:text-destructive inline-flex items-center justify-center transition-colors"
                  aria-label="Remove question"
                  title="Remove question"
                >
                  <Trash2 className="icon-sm" />
                </button>
              </div>
            </div>

            {question.property_field_id && !boundField ? (
              <div className="border-warning bg-warning/10 text-warning gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex items-center border">
                <AlertTriangle className="icon-sm shrink-0" />
                Bound field no longer exists. Pick a new field.
              </div>
            ) : null}

            <div className="gap-spacing-3 flex items-start">
              <div className="space-y-spacing-2 min-w-0 flex-1">
                <input
                  value={question.label}
                  onChange={(event) => onChange({ ...question, label: event.target.value })}
                  className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
                  placeholder="Question label"
                />
                <input
                  value={question.description ?? ''}
                  onChange={(event) => onChange({ ...question, description: event.target.value })}
                  className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
                  placeholder="Helper text"
                />
              </div>
            </div>

            <label className="gap-spacing-2 body-3 text-muted-foreground flex items-center">
              <input
                type="checkbox"
                checked={question.required ?? false}
                onChange={(event) => onChange({ ...question, required: event.target.checked })}
                className="checkbox-glass-green shrink-0"
              />
              Required
            </label>

            {question.type === 'contact' ? (
              <FormContactSubfieldsEditor question={question} onChange={onChange} />
            ) : null}

            {showOptions ? (
              <FormOptionListEditor
                options={options}
                onChange={(next) => onChange({ ...question, options: next })}
              />
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            className={cn('space-y-spacing-2 p-spacing-2', question.hidden && 'opacity-50')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <QuestionDisplay question={question} />
          </motion.div>
        )}
      </AnimatePresence>
      {bindOpen && canBind
        ? createPortal(
            <div
              ref={bindPopoverRef}
              data-form-field-bind-popover
              className="fixed z-dropdown"
              style={{
                top: bindPos?.top ?? 0,
                left: bindPos?.left ?? 0,
                visibility: bindPos ? 'visible' : 'hidden',
              }}
            >
              <FormFieldBindSubmenu
                questionType={question.type}
                targetSpaceId={targetSpaceId}
                selectedFieldId={question.property_field_id}
                onPickField={(field) => {
                  onChange(applyFieldBindingToQuestion(question, field))
                  setBindOpen(false)
                }}
                onOpenSettings={() => {
                  setBindOpen(false)
                  onOpenSettings?.()
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
