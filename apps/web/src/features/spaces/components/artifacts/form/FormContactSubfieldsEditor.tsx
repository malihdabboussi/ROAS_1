import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { FormQuestion } from '@/lib/forms'
import {
  CONTACT_SUBFIELDS,
  getContactSubfieldMeta,
  resolveContactSubfields,
  type ContactSubfieldId,
} from './contact-subfields'

export function FormContactSubfieldsEditor({
  question,
  onChange,
}: {
  question: FormQuestion
  onChange: (next: FormQuestion) => void
}) {
  const selected = resolveContactSubfields(question)
  const available = CONTACT_SUBFIELDS.filter((meta) => !selected.includes(meta.id))
  const [addOpen, setAddOpen] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const addPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (addPopoverRef.current?.contains(target)) return
      if (addBtnRef.current?.contains(target)) return
      setAddOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [addOpen])

  const setSubfields = (next: ContactSubfieldId[]) => {
    onChange({ ...question, contact_subfields: next })
  }

  const removeSubfield = (id: ContactSubfieldId) => {
    setSubfields(selected.filter((entry) => entry !== id))
  }

  const addSubfield = (id: ContactSubfieldId) => {
    setSubfields([...selected, id])
    setAddOpen(false)
  }

  return (
    <div className="space-y-spacing-2">
      <p className="body-4 text-muted-foreground font-medium">Contact fields</p>
      <div className="gap-spacing-2 flex flex-wrap">
        {selected.map((id) => {
          const meta = getContactSubfieldMeta(id)
          if (!meta) return null
          return (
            <span
              key={id}
              className="bg-hover-subtle text-foreground gap-spacing-1 body-4 rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex items-center"
            >
              {meta.label}
              <button
                type="button"
                onClick={() => removeSubfield(id)}
                className="text-muted-foreground hover:text-destructive inline-flex items-center"
                aria-label={`Remove ${meta.label}`}
                title={`Remove ${meta.label}`}
              >
                <X className="icon-xs" />
              </button>
            </span>
          )
        })}
        <div className="relative">
          <button
            ref={addBtnRef}
            type="button"
            onClick={() => setAddOpen((value) => !value)}
            disabled={available.length === 0}
            className="border-border text-muted-foreground hover:text-foreground gap-spacing-1 body-4 rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex items-center border border-dashed disabled:opacity-50"
          >
            <Plus className="icon-xs" />
            Add field
          </button>
          {addOpen && available.length > 0 ? (
            <div
              ref={addPopoverRef}
              className="surface-card border-border mt-spacing-1 w-spacing-48 rounded-spacing-2 p-spacing-1 absolute z-dropdown border shadow-lg"
            >
              {available.map((meta) => (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => addSubfield(meta.id)}
                  className="hover:bg-hover-subtle body-3 text-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 w-full text-left"
                >
                  {meta.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
