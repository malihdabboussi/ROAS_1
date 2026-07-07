'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Search,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { reclassifyContactApi, type Contact } from '@/lib/contacts/contacts-api'
import type { CrmContactRow } from '@/lib/contacts/crm-contacts-api'
import { ALL_COUNTRIES, COUNTRY_DIAL_LIST } from '@/lib/constants/countries'
import { cn } from '@/lib/utils/cn'
import { normalizeWebsiteUrl, validateWebsite } from '@/lib/utils/validation/contact-validation'
import {
  contactViewFieldDef,
  normalizeContactVisibleFieldOrderIds,
} from '../../lib/contact-view-field-meta'
import { addContactNote } from '../../services/contacts-view.service'
import type { SelectOption, ViewDef } from '../../types/space-schema'
import { SpaceCell } from '../cells/SpaceCell'
import type { NoteCardTintId } from './contact-note-card-tint'
import { NoteColorPicker } from './note-color-picker'

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[rgba(var(--color-primary-rgb),0.55)]'

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const summaryCls =
  'body-4 group/sum flex w-full cursor-pointer list-none items-center justify-between gap-2 font-medium text-[var(--foreground)] marker:hidden [&::-webkit-details-marker]:hidden'

const detailsSectionCls =
  'border-t border-[var(--border)] pt-4 [&[open]_summary_.contact-section-chevron]:rotate-90'

const summaryChevronCls =
  'contact-section-chevron h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-all duration-150 group-hover/sum:opacity-100'

const PANEL_SLIDE_EASE = [0.32, 0.72, 0, 1] as const
const PANEL_SLIDE_DURATION = 0.24

const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/
const MIN_PHONE_DIGITS = 7

const CONTACT_TYPE_OPTIONS: SelectOption[] = [
  { id: 'lead', label: 'lead', color: 'yellow' },
  { id: 'customer', label: 'customer', color: 'green' },
  { id: 'team_of_customer', label: 'team of customer', color: 'blue' },
  { id: 'cofounder', label: 'cofounder', color: 'purple' },
  { id: 'team_member', label: 'team member', color: 'purple' },
  { id: 'vendor', label: 'vendor', color: 'orange' },
  { id: 'investor', label: 'investor', color: 'indigo' },
  { id: 'peer', label: 'peer', color: 'cyan' },
  { id: 'friend', label: 'friend', color: 'pink' },
  { id: 'family', label: 'family', color: 'pink' },
  { id: 'unknown', label: 'unknown', color: 'gray' },
]

function contactTypeOptionFor(value: string): SelectOption {
  return (
    CONTACT_TYPE_OPTIONS.find((option) => option.id === value || option.label === value) ?? {
      id: value,
      label: value,
      color: 'gray',
    }
  )
}

function detectPhoneCountryCode(phone: string): string {
  if (!phone.startsWith('+')) return 'US'
  const sorted = [...COUNTRY_DIAL_LIST].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (phone.startsWith(c.dial)) return c.code
  }
  return 'US'
}

function stripPhoneDialCode(phone: string, dialCode: string): string {
  if (phone.startsWith(dialCode)) return phone.slice(dialCode.length).trim()
  return phone.replace(/^\+/, '').trim()
}

function contactToCrmRow(c: Contact): CrmContactRow {
  return {
    id: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    phone: c.phone,
    tags: c.tags ?? [],
    contact_type: (c.contact_type as CrmContactRow['contact_type']) || 'lead',
    contact_type_source: c.contact_type_source ?? null,
    contact_type_confidence: c.contact_type_confidence ?? null,
    contact_type_set_at: c.contact_type_set_at ?? null,
    contact_source: c.contact_source ?? null,
    contact_source_detail: c.contact_source_detail ?? null,
    is_archived: false,
    business_name: c.business_name,
    website: c.website,
    address: c.address ?? null,
    city: c.city,
    state: c.state,
    country: c.country,
    created_at: c.created_at,
    updated_at: c.updated_at,
    funnel_id: null,
    funnel_title: c.funnel_title ?? null,
    source_domain: null,
    page_slug: null,
  }
}

function readContactCellValue(row: CrmContactRow, fieldId: string): unknown {
  if (fieldId === 'tags') return row.tags ?? []
  if (fieldId === 'contact_type') {
    const v = row.contact_type
    return v ? [v] : []
  }
  if (fieldId === 'contact_source') {
    const v = row.contact_source
    return v ? [v] : []
  }
  const key = fieldId as keyof CrmContactRow
  if (key in row) return row[key]
  return null
}

type ValidationErrors = { phone?: string; website?: string; email?: string }

export interface ContactInfoSectionProps {
  contact: Contact
  view: ViewDef
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onContactFieldSave: (contactId: string, fieldId: string, value: unknown) => Promise<void>
  onCreateTagOption: (option: SelectOption) => void
  onUpdateTagOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteTagOption: (optionId: string) => void
  onCreateContactTypeOption: (option: SelectOption) => void
  onUpdateContactTypeOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteContactTypeOption: (optionId: string) => void
  onNoteAdded?: () => void
}

export function ContactInfoSection({
  contact,
  view,
  expanded,
  onExpandedChange,
  onContactFieldSave,
  onCreateTagOption,
  onUpdateTagOption,
  onDeleteTagOption,
  onCreateContactTypeOption,
  onUpdateContactTypeOption,
  onDeleteContactTypeOption,
  onNoteAdded,
}: ContactInfoSectionProps) {
  const [panelHot, setPanelHot] = useState(false)
  const panelLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const clearPanelLeaveTimer = useCallback(() => {
    if (panelLeaveTimerRef.current) {
      clearTimeout(panelLeaveTimerRef.current)
      panelLeaveTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const onFocusIn = () => setPanelHot(true)
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null
      if (next && el.contains(next)) return
      setPanelHot(false)
    }
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    return () => {
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
    }
  }, [expanded])

  useEffect(() => () => clearPanelLeaveTimer(), [clearPanelLeaveTimer])

  const row = useMemo(() => contactToCrmRow(contact), [contact])
  const cc = view.contacts_config ?? {}

  const visibleFieldSet = useMemo(
    () => new Set(normalizeContactVisibleFieldOrderIds(view.visible_fields)),
    [view.visible_fields],
  )
  const isFieldVisible = (id: string) => visibleFieldSet.has(id)
  const hasAnyVisible = (...ids: string[]) => ids.some((id) => visibleFieldSet.has(id))

  const tagOptions: SelectOption[] = useMemo(() => {
    const schema = cc.tag_options ?? []
    const schemaIds = new Set(schema.map((o) => o.id))
    const extras: SelectOption[] = []
    for (const t of row.tags ?? []) {
      if (!schemaIds.has(t)) {
        schemaIds.add(t)
        extras.push({ id: t, label: t, color: 'blue' })
      }
    }
    return [...schema, ...extras]
  }, [cc.tag_options, row.tags])

  const contactTypeOptions: SelectOption[] = useMemo(() => {
    const schema = cc.contact_type_options ?? []
    const schemaIds = new Set(schema.map((o) => o.id))
    const extras: SelectOption[] = []
    const ct = row.contact_type
    if (ct && !schemaIds.has(ct)) {
      schemaIds.add(ct)
      extras.push(contactTypeOptionFor(ct))
    }
    for (const option of CONTACT_TYPE_OPTIONS) {
      if (!schemaIds.has(option.id)) extras.push(option)
    }
    return [...schema, ...extras]
  }, [cc.contact_type_options, row.contact_type])

  const tagsField = useMemo(
    () => ({ ...contactViewFieldDef('tags'), options: tagOptions }),
    [tagOptions],
  )
  const stageField = useMemo(
    () => ({ ...contactViewFieldDef('contact_type'), options: contactTypeOptions }),
    [contactTypeOptions],
  )
  const sourceField = useMemo(() => contactViewFieldDef('contact_source'), [])

  const [firstName, setFirstName] = useState(contact.first_name || '')
  const [lastName, setLastName] = useState(contact.last_name || '')
  const [email, setEmail] = useState(contact.email || '')
  const [phoneCountryCode, setPhoneCountryCode] = useState(() =>
    detectPhoneCountryCode(contact.phone || ''),
  )
  const [phoneLocal, setPhoneLocal] = useState(() => {
    const p = contact.phone || ''
    const cc = detectPhoneCountryCode(p)
    const c = COUNTRY_DIAL_LIST.find((e) => e.code === cc)
    return c ? stripPhoneDialCode(p, c.dial) : p.replace(/^\+\d+\s*/, '')
  })
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false)
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('')
  const phoneCountrySearchRef = useRef<HTMLInputElement>(null)
  const phoneFieldRef = useRef<HTMLDivElement>(null)
  const [businessName, setBusinessName] = useState(contact.business_name || '')
  const [website, setWebsite] = useState(contact.website || '')
  const [addressLine, setAddressLine] = useState(contact.address || '')
  const [city, setCity] = useState(contact.city || '')
  const [stateVal, setStateVal] = useState(contact.state || '')
  const [country, setCountry] = useState(contact.country || '')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const countrySearchRef = useRef<HTMLInputElement>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [noteDraft, setNoteDraft] = useState('')
  const [infoNoteCardTint, setInfoNoteCardTint] = useState<NoteCardTintId | null>(null)
  const [noteSending, setNoteSending] = useState(false)
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set())
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    setFirstName(contact.first_name || '')
    setLastName(contact.last_name || '')
    setEmail(contact.email || '')
    const p = contact.phone || ''
    const cc = detectPhoneCountryCode(p)
    setPhoneCountryCode(cc)
    const c = COUNTRY_DIAL_LIST.find((e) => e.code === cc)
    setPhoneLocal(c ? stripPhoneDialCode(p, c.dial) : p.replace(/^\+\d+\s*/, ''))
    setPhoneCountryOpen(false)
    setPhoneCountrySearch('')
    setBusinessName(contact.business_name || '')
    setWebsite(contact.website || '')
    setAddressLine(contact.address || '')
    setCity(contact.city || '')
    setStateVal(contact.state || '')
    setCountry(contact.country || '')
    setValidationErrors({})
  }, [contact.id])

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES
    const q = countrySearch.toLowerCase()
    return ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
  }, [countrySearch])

  useEffect(() => {
    if (countryDropdownOpen) {
      setTimeout(() => countrySearchRef.current?.focus(), 50)
    } else {
      setCountrySearch('')
    }
  }, [countryDropdownOpen])

  useEffect(() => {
    if (!countryDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(target)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [countryDropdownOpen])

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t))
    }
  }, [])

  const selectedPhoneCountry = useMemo(
    () => COUNTRY_DIAL_LIST.find((c) => c.code === phoneCountryCode) ?? COUNTRY_DIAL_LIST[0]!,
    [phoneCountryCode],
  )

  const filteredPhoneCountries = useMemo(() => {
    if (!phoneCountrySearch) return COUNTRY_DIAL_LIST
    const q = phoneCountrySearch.toLowerCase()
    return COUNTRY_DIAL_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [phoneCountrySearch])

  useEffect(() => {
    if (phoneCountryOpen) {
      setTimeout(() => phoneCountrySearchRef.current?.focus(), 50)
    } else {
      setPhoneCountrySearch('')
    }
  }, [phoneCountryOpen])

  useEffect(() => {
    if (!phoneCountryOpen) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (phoneFieldRef.current && !phoneFieldRef.current.contains(t)) {
        setPhoneCountryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [phoneCountryOpen])

  const runSave = useCallback(
    async (field: string, value: unknown) => {
      setSavingFields((prev) => new Set(prev).add(field))
      await onContactFieldSave(contact.id, field, value)
      setSavingFields((prev) => {
        const next = new Set(prev)
        next.delete(field)
        return next
      })
    },
    [contact.id, onContactFieldSave],
  )

  const debouncedSave = useCallback(
    (field: string, value: unknown, delay = 1000) => {
      if (timers.current[field]) clearTimeout(timers.current[field])
      timers.current[field] = setTimeout(() => {
        void runSave(field, value)
        delete timers.current[field]
      }, delay)
    },
    [runSave],
  )

  const debouncedPhoneSave = useCallback(
    (countryCode: string, localDigits: string) => {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.phone
        return next
      })
      if (timers.current.phone) clearTimeout(timers.current.phone)
      timers.current.phone = setTimeout(() => {
        const c = COUNTRY_DIAL_LIST.find((e) => e.code === countryCode) ?? COUNTRY_DIAL_LIST[0]!
        const trimmed = localDigits.trim()
        if (!trimmed) {
          void runSave('phone', null)
          delete timers.current.phone
          return
        }
        const full = `${c.dial} ${trimmed}`
        const digitCount = full.replace(/\D/g, '').length
        if (!PHONE_RE.test(full) || digitCount < MIN_PHONE_DIGITS) {
          setValidationErrors((prev) => ({
            ...prev,
            phone: 'Enter a valid phone number (min 7 digits)',
          }))
          delete timers.current.phone
          return
        }
        void runSave('phone', full)
        delete timers.current.phone
      }, 1000)
    },
    [runSave],
  )

  const handleEmailChange = (v: string) => {
    setEmail(v)
    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next.email
      return next
    })
    if (timers.current.email) clearTimeout(timers.current.email)
    timers.current.email = setTimeout(() => {
      const trimmed = v.trim()
      if (!trimmed) {
        setValidationErrors((prev) => ({
          ...prev,
          email: 'Email is required',
        }))
        delete timers.current.email
        return
      }
      if (!SIMPLE_EMAIL_RE.test(trimmed)) {
        setValidationErrors((prev) => ({
          ...prev,
          email: 'Please enter a valid email address',
        }))
        delete timers.current.email
        return
      }
      void runSave('email', trimmed)
      delete timers.current.email
    }, 1000)
  }

  const handleWebsiteChange = (v: string) => {
    setWebsite(v)
    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next.website
      return next
    })
    if (timers.current.website) clearTimeout(timers.current.website)
    timers.current.website = setTimeout(() => {
      if (v && !validateWebsite(v)) {
        setValidationErrors((prev) => ({
          ...prev,
          website: 'Please enter a valid website URL',
        }))
        delete timers.current.website
        return
      }
      const final = v ? normalizeWebsiteUrl(v) : null
      if (final) setWebsite(final)
      void runSave('website', final)
      delete timers.current.website
    }, 1000)
  }

  const handleCreateTag = useCallback(
    (_fieldId: string, option: SelectOption) => {
      onCreateTagOption(option)
      const currentTags = row.tags ?? []
      void onContactFieldSave(contact.id, 'tags', [...currentTags, option.label])
    },
    [onCreateTagOption, onContactFieldSave, contact.id, row.tags],
  )

  const handleCreateContactType = useCallback(
    (_fieldId: string, option: SelectOption) => {
      onCreateContactTypeOption(option)
      void onContactFieldSave(contact.id, 'contact_type', option.label)
    },
    [onCreateContactTypeOption, onContactFieldSave, contact.id],
  )

  const saveFieldTags = useCallback(
    (next: unknown) => {
      if (!Array.isArray(next)) return
      const labels = (next as string[]).map(
        (id) => tagOptions.find((o) => o.id === id)?.label ?? id,
      )
      void onContactFieldSave(contact.id, 'tags', labels)
    },
    [contact.id, onContactFieldSave, tagOptions],
  )

  const saveFieldContactType = useCallback(
    async (next: unknown) => {
      if (!Array.isArray(next)) return
      const selected = next as string[]
      const label =
        contactTypeOptions.find((o) => o.id === selected[selected.length - 1])?.label ??
        selected[selected.length - 1] ??
        ''
      const result = await reclassifyContactApi(contact.id, { new_contact_type: label })
      if (result.requires_confirmation) {
        const memories = Number(result.summary?.memories_to_delete ?? 0)
        const confirmed = window.confirm(
          `I’ll remove ${memories} customer-brain memor${memories === 1 ? 'y' : 'ies'} for this contact. Continue?`,
        )
        if (!confirmed) return
        await reclassifyContactApi(contact.id, { new_contact_type: label, confirmed: true })
      }
      await onContactFieldSave(contact.id, 'contact_type', label)
    },
    [contact.id, onContactFieldSave, contactTypeOptions],
  )

  const saveFieldContactSource = useCallback(
    (next: unknown) => {
      if (!Array.isArray(next)) return
      const selected = next as string[]
      void onContactFieldSave(contact.id, 'contact_source', selected[selected.length - 1] ?? null)
    },
    [contact.id, onContactFieldSave],
  )

  const handleAddNote = useCallback(async () => {
    const text = noteDraft.trim()
    if (!text || noteSending) return
    setNoteSending(true)
    await addContactNote(contact.id, text, infoNoteCardTint)
    setNoteDraft('')
    setInfoNoteCardTint(null)
    onNoteAdded?.()
    setNoteSending(false)
  }, [contact.id, noteDraft, noteSending, onNoteAdded, infoNoteCardTint])

  const utmEntries = useMemo(() => {
    const u = contact.utm
    if (!u || typeof u !== 'object') return []
    return Object.entries(u).filter(([, val]) => val != null && String(val).length > 0)
  }, [contact.utm])

  return (
    <div
      ref={panelRef}
      className="flex h-full min-h-0 flex-col overflow-hidden"
      onPointerEnter={() => {
        clearPanelLeaveTimer()
        setPanelHot(true)
      }}
      onPointerLeave={() => {
        clearPanelLeaveTimer()
        panelLeaveTimerRef.current = setTimeout(() => {
          if (panelRef.current?.contains(document.activeElement)) {
            panelLeaveTimerRef.current = null
            return
          }
          setPanelHot(false)
          panelLeaveTimerRef.current = null
        }, 200)
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: PANEL_SLIDE_DURATION, ease: PANEL_SLIDE_EASE }}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <div className="border-border px-spacing-6 py-spacing-3 flex shrink-0 items-center justify-between border-b">
              <h3 className="body-2 text-foreground min-w-0 truncate font-semibold">
                Contact info
              </h3>
              <div className="flex min-h-[22px] min-w-8 shrink-0 items-center justify-end">
                <AnimatePresence initial={false}>
                  {panelHot ? (
                    <motion.div
                      key="contact-info-collapse"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Tooltip label="Collapse" side="bottom">
                        <button
                          type="button"
                          onClick={() => onExpandedChange(false)}
                          className="team-conv-inline-icon-btn"
                          aria-label="Collapse contact info"
                        >
                          <PanelLeftClose className="icon-sm" />
                        </button>
                      </Tooltip>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-spacing-6 space-y-4">
                <div className="space-y-1">
                  <div className="body-4 flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
                    <Mail className="h-3 w-3" />
                    <span>Email</span>
                    {savingFields.has('email') && <Loader className="h-3 w-3 animate-spin" />}
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="email@example.com"
                    autoComplete="email"
                    className={`${inputCls} ${validationErrors.email ? 'border-[var(--color-destructive)]' : ''}`}
                  />
                  {validationErrors.email && (
                    <p className="body-4 text-[var(--color-destructive)]">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="body-4 text-[var(--color-muted-foreground)]">Name</div>
                  <div className="body-3 truncate font-medium text-[var(--foreground)]">
                    {[firstName, lastName].filter(Boolean).join(' ') || email}
                  </div>
                </div>

                {isFieldVisible('tags') && (
                  <div className="space-y-1">
                    <div className="body-4 text-[var(--color-muted-foreground)]">Tags</div>
                    <div
                      className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                      data-cell
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <SpaceCell
                        field={tagsField}
                        value={readContactCellValue(row, 'tags')}
                        roster={[]}
                        currentUserId={null}
                        onCreateOption={handleCreateTag}
                        onUpdateOption={(_fid, oid, u) => onUpdateTagOption(oid, u)}
                        onDeleteOption={(_fid, oid) => onDeleteTagOption(oid)}
                        onChange={saveFieldTags}
                      />
                    </div>
                  </div>
                )}

                {isFieldVisible('contact_type') && (
                  <div className="space-y-1">
                    <div className="body-4 text-[var(--color-muted-foreground)]">Role</div>
                    <div
                      className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                      data-cell
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <SpaceCell
                        field={stageField}
                        value={readContactCellValue(row, 'contact_type')}
                        roster={[]}
                        currentUserId={null}
                        onCreateOption={handleCreateContactType}
                        onUpdateOption={(_fid, oid, u) => onUpdateContactTypeOption(oid, u)}
                        onDeleteOption={(_fid, oid) => onDeleteContactTypeOption(oid)}
                        onChange={saveFieldContactType}
                      />
                    </div>
                  </div>
                )}

                {hasAnyVisible('first_name', 'last_name', 'phone') && (
                  <details open className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="min-w-0">PERSONAL INFORMATION</span>
                      <ChevronRight className={summaryChevronCls} aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {isFieldVisible('first_name') && (
                        <div className="space-y-1">
                          <div className="body-4 flex items-center gap-1 text-[var(--color-muted-foreground)]">
                            <span>First Name</span>
                            {savingFields.has('first_name') && (
                              <Loader className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value)
                              debouncedSave('first_name', e.target.value || null)
                            }}
                            placeholder="Enter first name..."
                            className={inputCls}
                          />
                        </div>
                      )}
                      {isFieldVisible('last_name') && (
                        <div className="space-y-1">
                          <div className="body-4 flex items-center gap-1 text-[var(--color-muted-foreground)]">
                            <span>Last Name</span>
                            {savingFields.has('last_name') && (
                              <Loader className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value)
                              debouncedSave('last_name', e.target.value || null)
                            }}
                            placeholder="Enter last name..."
                            className={inputCls}
                          />
                        </div>
                      )}
                      {isFieldVisible('phone') && (
                        <div className="space-y-1">
                          <div className="body-4 flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
                            <Phone className="h-3 w-3" />
                            <span>Phone</span>
                            {savingFields.has('phone') && (
                              <Loader className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <div ref={phoneFieldRef} className="w-full">
                            <div
                              className={cn(
                                'overflow-hidden rounded-lg border bg-[var(--background)] transition-colors',
                                validationErrors.phone
                                  ? 'border-[var(--color-destructive)]'
                                  : 'border-[var(--color-border)]',
                              )}
                            >
                              <div className="flex items-center gap-1 px-2 py-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPhoneCountryOpen((o) => !o)}
                                  className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                                >
                                  <span>{selectedPhoneCountry.flag}</span>
                                  <span className="text-[var(--color-muted-foreground)]">
                                    {selectedPhoneCountry.dial}
                                  </span>
                                  <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
                                </button>
                                <input
                                  type="tel"
                                  value={phoneLocal}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setPhoneLocal(v)
                                    debouncedPhoneSave(phoneCountryCode, v)
                                  }}
                                  placeholder="Phone number"
                                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                                />
                              </div>
                              {phoneCountryOpen && (
                                <div className="border-t border-[var(--color-border)]">
                                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                                    <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                                    <input
                                      ref={phoneCountrySearchRef}
                                      type="text"
                                      value={phoneCountrySearch}
                                      onChange={(e) => setPhoneCountrySearch(e.target.value)}
                                      placeholder="Search country…"
                                      className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                                    />
                                  </div>
                                  <div className="dropdown-list-scroll border-t border-[var(--color-border)]">
                                    {filteredPhoneCountries.map((c) => (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          setPhoneCountryCode(c.code)
                                          setPhoneCountryOpen(false)
                                          setPhoneCountrySearch('')
                                          debouncedPhoneSave(c.code, phoneLocal)
                                        }}
                                        className={cn(
                                          'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)]',
                                          c.code === phoneCountryCode
                                            ? 'bg-[var(--color-hover-subtle)]'
                                            : '',
                                        )}
                                      >
                                        <span>{c.flag}</span>
                                        <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                                          {c.name}
                                        </span>
                                        <span className="shrink-0 text-[var(--color-muted-foreground)]">
                                          {c.dial}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {validationErrors.phone && (
                            <p className="body-4 text-[var(--color-destructive)]">
                              {validationErrors.phone}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {hasAnyVisible('business_name', 'website') && (
                  <details open className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="min-w-0">BUSINESS INFORMATION</span>
                      <ChevronRight className={summaryChevronCls} aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {isFieldVisible('business_name') && (
                        <div className="space-y-1">
                          <div className="body-4 flex items-center gap-1 text-[var(--color-muted-foreground)]">
                            <Building2 className="h-3 w-3" />
                            <span>Business Name</span>
                            {savingFields.has('business_name') && (
                              <Loader className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => {
                              setBusinessName(e.target.value)
                              debouncedSave('business_name', e.target.value || null)
                            }}
                            placeholder="Enter business name..."
                            className={inputCls}
                          />
                        </div>
                      )}
                      {isFieldVisible('website') && (
                        <div className="space-y-1">
                          <div className="body-4 flex items-center gap-1 text-[var(--color-muted-foreground)]">
                            <Globe className="h-3 w-3" />
                            <span>Website</span>
                            {savingFields.has('website') && (
                              <Loader className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => handleWebsiteChange(e.target.value)}
                            placeholder="https://..."
                            className={`${inputCls} ${validationErrors.website ? 'border-[var(--color-destructive)]' : ''}`}
                          />
                          {validationErrors.website && (
                            <p className="body-4 text-[var(--color-destructive)]">
                              {validationErrors.website}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {hasAnyVisible('address', 'city', 'state', 'country') && (
                  <details open className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="min-w-0">ADDRESS</span>
                      <ChevronRight className={summaryChevronCls} aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {isFieldVisible('address') && (
                        <div className="space-y-1">
                          <div className="body-4 text-[var(--color-muted-foreground)]">
                            Street / Address
                          </div>
                          <input
                            type="text"
                            value={addressLine}
                            onChange={(e) => {
                              setAddressLine(e.target.value)
                              debouncedSave('address', e.target.value || null)
                            }}
                            placeholder="Address line..."
                            className={inputCls}
                          />
                        </div>
                      )}
                      {(isFieldVisible('city') || isFieldVisible('state')) && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {isFieldVisible('city') && (
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => {
                                setCity(e.target.value)
                                debouncedSave('city', e.target.value || null)
                              }}
                              placeholder="City"
                              className={inputCls}
                            />
                          )}
                          {isFieldVisible('state') && (
                            <input
                              type="text"
                              value={stateVal}
                              onChange={(e) => {
                                setStateVal(e.target.value)
                                debouncedSave('state', e.target.value || null)
                              }}
                              placeholder="State"
                              className={inputCls}
                            />
                          )}
                        </div>
                      )}
                      {isFieldVisible('country') && (
                        <div className="space-y-1">
                          <div className="body-4 text-[var(--color-muted-foreground)]">Country</div>
                          <div ref={countryDropdownRef} className="w-full min-w-0">
                            <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--background)] transition-colors">
                              <button
                                type="button"
                                onClick={() => setCountryDropdownOpen((o) => !o)}
                                className={cn(
                                  'flex w-full items-center justify-between gap-1 px-2.5 py-1.5 text-left text-xs outline-none transition-colors',
                                  country
                                    ? 'text-[var(--foreground)]'
                                    : 'text-[var(--color-muted-foreground)]',
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {country || 'Select country...'}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'h-3 w-3 shrink-0 opacity-50 transition-transform',
                                    countryDropdownOpen && 'rotate-180',
                                  )}
                                />
                              </button>
                              {countryDropdownOpen && (
                                <div className="border-t border-[var(--color-border)]">
                                  <div className="flex-shrink-0 border-b border-[var(--border)]">
                                    <div className="flex items-center gap-2 bg-[var(--background)] p-2">
                                      <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                                      <input
                                        ref={countrySearchRef}
                                        type="text"
                                        placeholder="Search country..."
                                        value={countrySearch}
                                        onChange={(e) => setCountrySearch(e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                                      />
                                    </div>
                                  </div>
                                  <div className="p-spacing-2 dropdown-list-scroll min-h-0 overflow-y-auto">
                                    {filteredCountries.length === 0 ? (
                                      <p className="body-3 py-2 text-center text-[var(--color-muted-foreground)]">
                                        No countries found
                                      </p>
                                    ) : (
                                      <div className="space-y-spacing-1">
                                        {filteredCountries.map((c) => (
                                          <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => {
                                              setCountry(c.name)
                                              setCountryDropdownOpen(false)
                                              void runSave('country', c.name)
                                            }}
                                            className={cn(
                                              'body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left outline-none transition-colors',
                                              country === c.name
                                                ? 'dropdown-option-selected text-[var(--color-muted-foreground)]'
                                                : 'hover:bg-hover-subtle text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
                                            )}
                                          >
                                            {c.name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {isFieldVisible('contact_source') && (
                  <details open className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="min-w-0">MARKETING</span>
                      <ChevronRight className={summaryChevronCls} aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1">
                        <div className="body-4 text-[var(--color-muted-foreground)]">
                          Contact Source
                        </div>
                        <div
                          className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                          data-cell
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <SpaceCell
                            field={sourceField}
                            value={readContactCellValue(row, 'contact_source')}
                            roster={[]}
                            currentUserId={null}
                            onChange={saveFieldContactSource}
                          />
                        </div>
                      </div>
                      {contact.contact_source_detail?.trim() && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="body-4 text-[var(--color-muted-foreground)]">
                            Source Detail
                          </span>
                          <span className="body-3 truncate text-[var(--foreground)]">
                            {contact.contact_source_detail.trim()}
                          </span>
                        </div>
                      )}
                      {contact.source && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="body-4 text-[var(--color-muted-foreground)]">
                            Origin
                          </span>
                          <span className="body-3 text-[var(--foreground)]">{contact.source}</span>
                        </div>
                      )}
                      {contact.funnel_title && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="body-4 text-[var(--color-muted-foreground)]">
                            Funnel
                          </span>
                          <span className="body-3 truncate text-[var(--foreground)]">
                            {contact.funnel_title}
                          </span>
                        </div>
                      )}
                      {utmEntries.length > 0 && (
                        <div className="space-y-1">
                          <div className="body-4 text-[var(--color-muted-foreground)]">UTM</div>
                          <div className="space-y-0.5">
                            {utmEntries.map(([k, val]) => (
                              <div key={k} className="body-3 text-[var(--foreground)]">
                                <span className="text-[var(--color-muted-foreground)]">{k}:</span>{' '}
                                {String(val)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {isFieldVisible('notes') && (
                  <details open className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0">NOTES</span>
                        <ChevronRight className={summaryChevronCls} aria-hidden />
                      </span>
                      <span
                        className="relative flex shrink-0 items-center"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AnimatePresence>
                          {noteDraft.trim() ? (
                            <motion.button
                              key="note-save"
                              type="button"
                              initial={{ opacity: 0, x: 14 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 14 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              disabled={noteSending}
                              className="chip-glass-green rounded-lg px-2.5 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void handleAddNote()
                              }}
                            >
                              {noteSending ? 'Saving…' : 'Save'}
                            </motion.button>
                          ) : null}
                        </AnimatePresence>
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Write a note… Appears in activity."
                        rows={4}
                        className={`${inputCls} resize-y`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="body-4 text-[var(--color-muted-foreground)]">Color</span>
                        <NoteColorPicker
                          value={infoNoteCardTint}
                          onChange={setInfoNoteCardTint}
                          variant="square"
                          placement="down"
                        />
                      </div>
                    </div>
                  </details>
                )}

                {(contact.ip || contact.user_agent) && (
                  <details className={detailsSectionCls}>
                    <summary className={summaryCls}>
                      <span className="min-w-0">TECHNICAL DETAILS</span>
                      <ChevronRight className={summaryChevronCls} aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-2">
                      {contact.ip && (
                        <div className="body-3 text-[var(--color-muted-foreground)]">
                          <span className="text-[var(--foreground)]">IP:</span> {contact.ip}
                        </div>
                      )}
                      {contact.user_agent && (
                        <div className="body-3 break-all text-[var(--color-muted-foreground)]">
                          <span className="text-[var(--foreground)]">User Agent:</span>{' '}
                          {contact.user_agent}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {isFieldVisible('created_at') && (
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="body-4 text-[var(--color-muted-foreground)]">Created</span>
                      <span className="body-3 text-[var(--foreground)]">
                        {new Date(contact.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: PANEL_SLIDE_DURATION, ease: PANEL_SLIDE_EASE }}
            className="gap-spacing-3 px-spacing-2 py-spacing-3 flex min-h-0 flex-1 flex-col items-center overflow-hidden"
          >
            <span className="text-[10px] leading-tight text-[var(--color-muted-foreground)]">
              Contact info
            </span>
            <Tooltip label="Expand contact info" side="right">
              <button
                type="button"
                onClick={() => onExpandedChange(true)}
                className="team-conv-inline-icon-btn"
                aria-label="Expand contact info"
              >
                <PanelLeftOpen className="icon-sm" />
              </button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
