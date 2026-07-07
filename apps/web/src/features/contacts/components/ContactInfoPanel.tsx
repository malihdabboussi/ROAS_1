'use client'

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LuCalendar as Calendar,
  LuCheck as CheckIcon,
  LuHash as HashIcon,
  LuList as ListIcon,
  LuLoader as Loader,
  LuMail as Mail,
  LuPhone as Phone,
  LuPlus as Plus,
  LuTag as Tag,
  LuType as TypeIcon,
  LuX as X,
} from 'react-icons/lu'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import { tagNameToColorKey } from '@/features/properties/constants/tag-picker-colors'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useCustomFields } from '@/lib/properties/use-custom-fields'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import { CONTACTS_TOAST_ERRORS } from '../config/contacts-toast-errors.config'
import type { Contact } from '../services/contacts-api'
import { updateContact } from '../services/contacts-api'

interface ContactInfoPanelProps {
  contact: Contact
  onContactUpdated: (updated: Contact) => void
  onClose: () => void
}

export function ContactInfoPanel({ contact, onContactUpdated, onClose }: ContactInfoPanelProps) {
  const [tagNamePool, setTagNamePool] = useState<string[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [contactTags, setContactTags] = useState<string[]>(contact.tags || [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setTagsLoading(true)
      const res = await cachedFetch(
        getOrgScopedKey('segments-filter-options'),
        () => backendGet<{ tags: string[] }>('/api/segments/filter-options'),
        { ttlMs: 60_000 },
      ).catch(() => ({ tags: [] as string[] }))
      if (!cancelled) {
        setTagNamePool(Array.isArray(res.tags) ? res.tags : [])
        setTagsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tags = useMemo(() => {
    const seen = new Set<string>()
    const merged: string[] = []
    for (const name of [...tagNamePool, ...contactTags]) {
      if (typeof name !== 'string' || !name.trim()) continue
      const n = name.trim()
      if (seen.has(n)) continue
      seen.add(n)
      merged.push(n)
    }
    merged.sort((a, b) => a.localeCompare(b))
    return merged.map((name) => ({
      id: name,
      name,
      color: tagNameToColorKey(name),
    }))
  }, [tagNamePool, contactTags])

  const {
    fields: customFieldDefinitionsRaw,
    isLoading: customFieldsLoading,
    createField,
  } = useCustomFields()
  const customFieldDefinitions = useMemo(
    () => customFieldDefinitionsRaw.filter((f) => !f.is_system),
    [customFieldDefinitionsRaw],
  )

  // Local form values
  const [firstName, setFirstName] = useState(contact.first_name || '')
  const [lastName, setLastName] = useState(contact.last_name || '')
  const [phone, setPhone] = useState(contact.phone || '')
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string | number | boolean | null>
  >((contact.custom_fields as Record<string, string | number | boolean | null>) || {})

  const [savingFields, setSavingFields] = useState<Set<string>>(new Set())
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const customFieldSaveTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Tag UI state
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const tagSearchInputRef = useRef<HTMLInputElement>(null)
  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const tagTriggerBtnRef = useRef<HTMLButtonElement>(null)
  const [tagDropdownPos, setTagDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!showTagDropdown || !tagTriggerBtnRef.current) return
    const rect = tagTriggerBtnRef.current.getBoundingClientRect()
    setTagDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [showTagDropdown])

  // New Tag Dialog
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)

  // New Custom Field Dialog
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<
    'text' | 'number' | 'date' | 'dropdown' | 'boolean'
  >('text')
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([])
  const [newFieldOptionInput, setNewFieldOptionInput] = useState('')
  const [isCreatingField, setIsCreatingField] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags
    const lower = tagSearch.toLowerCase()
    return tags.filter((t) => t.name.toLowerCase().includes(lower))
  }, [tags, tagSearch])

  useEffect(() => {
    if (showTagDropdown && tagSearchInputRef.current) {
      tagSearchInputRef.current.focus()
    }
  }, [showTagDropdown])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(target) &&
        !target.closest('[data-tag-dropdown-portal]') &&
        !tagTriggerBtnRef.current?.contains(target)
      ) {
        setShowTagDropdown(false)
        setTagSearch('')
      }
    }
    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [showTagDropdown])

  // Sync when contact prop changes
  useEffect(() => {
    setFirstName(contact.first_name || '')
    setLastName(contact.last_name || '')
    setPhone(contact.phone || '')
    setContactTags(contact.tags || [])
    setCustomFieldValues(
      (contact.custom_fields as Record<string, string | number | boolean | null>) || {},
    )
  }, [contact.id])

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSavingFields((prev) => new Set(prev).add(field))
      try {
        const updated = await updateContact(contact.id, { [field]: value } as Record<
          string,
          unknown
        >)
        onContactUpdated(updated)
      } catch {
        // silently fail
      } finally {
        setSavingFields((prev) => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })
      }
    },
    [contact.id, onContactUpdated],
  )

  const debouncedSave = useCallback(
    (field: string, value: unknown, delay = 1000) => {
      if (saveTimers.current[field]) clearTimeout(saveTimers.current[field])
      saveTimers.current[field] = setTimeout(() => {
        saveField(field, value)
        delete saveTimers.current[field]
      }, delay)
    },
    [saveField],
  )

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer))
      Object.values(customFieldSaveTimers.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const handleFirstNameChange = (v: string) => {
    setFirstName(v)
    debouncedSave('first_name', v || null)
  }
  const handleLastNameChange = (v: string) => {
    setLastName(v)
    debouncedSave('last_name', v || null)
  }
  const handlePhoneChange = (v: string) => {
    setPhone(v)
    debouncedSave('phone', v || null)
  }

  // Toggle a tag on/off for this contact
  const handleToggleTag = useCallback(
    (tagName: string) => {
      const updated = contactTags.includes(tagName)
        ? contactTags.filter((t) => t !== tagName)
        : [...contactTags, tagName]
      setContactTags(updated)
      saveField('tags', updated)
    },
    [contactTags, saveField],
  )

  const handleCreateNewTag = useCallback(async () => {
    if (!newTagName.trim()) {
      setTagError('Tag name is required')
      return
    }
    const trimmed = newTagName.trim()
    if (contactTags.includes(trimmed)) {
      setTagError('This tag is already on the contact')
      return
    }
    setIsCreatingTag(true)
    setTagError(null)
    const updated = [...contactTags, trimmed]
    try {
      const result = await updateContact(contact.id, { tags: updated })
      onContactUpdated(result)
      setContactTags(result.tags ?? updated)
      setTagNamePool((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed].sort((a, b) => a.localeCompare(b)),
      )
      // New tag changes the distinct-tag pool served by /api/segments/filter-options.
      invalidateCachedFetch('segments-filter-options')
      setNewTagDialogOpen(false)
      setNewTagName('')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : CONTACTS_TOAST_ERRORS.CREATE_TAG_FAILED.userMessage
      setTagError(msg)
      toast.error(msg)
    } finally {
      setIsCreatingTag(false)
    }
  }, [newTagName, contactTags, contact.id, onContactUpdated])

  // Custom field value change with debounce
  const handleCustomFieldChange = useCallback(
    (fieldKey: string, value: string | number | boolean | null) => {
      const updated = { ...customFieldValues, [fieldKey]: value }
      setCustomFieldValues(updated)

      if (customFieldSaveTimers.current[fieldKey])
        clearTimeout(customFieldSaveTimers.current[fieldKey])
      customFieldSaveTimers.current[fieldKey] = setTimeout(async () => {
        setSavingFields((prev) => new Set(prev).add(`custom_${fieldKey}`))
        try {
          const result = await updateContact(contact.id, { custom_fields: updated })
          onContactUpdated(result)
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : CONTACTS_TOAST_ERRORS.SAVE_FIELD_FAILED.userMessage,
          )
        } finally {
          setSavingFields((prev) => {
            const next = new Set(prev)
            next.delete(`custom_${fieldKey}`)
            return next
          })
          delete customFieldSaveTimers.current[fieldKey]
        }
      }, 1000)
    },
    [customFieldValues, contact.id, onContactUpdated],
  )

  const handleCreateNewField = useCallback(async () => {
    if (!newFieldName.trim()) {
      setFieldError('Field name is required')
      return
    }
    if (newFieldType === 'dropdown' && newFieldOptions.length === 0) {
      setFieldError('Add at least one option for dropdown fields')
      return
    }
    setIsCreatingField(true)
    setFieldError(null)
    try {
      const newField = await createField({
        name: newFieldName.trim(),
        field_type: newFieldType,
        options: newFieldOptions,
      })
      setNewFieldDialogOpen(false)
      setNewFieldName('')
      setNewFieldType('text')
      setNewFieldOptions([])
      setNewFieldOptionInput('')
      const initialValue = newFieldType === 'boolean' ? false : newFieldType === 'number' ? 0 : ''
      handleCustomFieldChange(newField.field_key, initialValue)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : CONTACTS_TOAST_ERRORS.CREATE_FIELD_FAILED.userMessage
      setFieldError(msg)
      toast.error(msg)
    } finally {
      setIsCreatingField(false)
    }
  }, [newFieldName, newFieldType, newFieldOptions, createField, handleCustomFieldChange])

  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-6 space-y-spacing-6 h-full overflow-y-auto border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="title-h6">CONTACT INFO</h2>
        <button type="button" onClick={onClose} className="btn-icon-bare">
          <X className="icon-sm" />
        </button>
      </div>

      {/* Core fields: label | value rows */}
      <div className="gap-spacing-3 grid grid-cols-[minmax(100px,auto)_1fr] items-center">
        <div className="gap-spacing-2 typo-caption text-muted-foreground flex items-center">
          <Mail className="icon-xs" />
          <span>Email</span>
        </div>
        <div className="body-3 text-foreground break-all">{contact.email}</div>

        <div className="typo-caption text-muted-foreground gap-spacing-1 flex items-center">
          First Name
          {savingFields.has('first_name') && <Loader className="icon-xs animate-spin" />}
        </div>
        <input
          type="text"
          value={firstName}
          onChange={(e) => handleFirstNameChange(e.target.value)}
          placeholder="Enter first name..."
          className="input-glass w-full"
        />

        <div className="typo-caption text-muted-foreground gap-spacing-1 flex items-center">
          Last Name
          {savingFields.has('last_name') && <Loader className="icon-xs animate-spin" />}
        </div>
        <input
          type="text"
          value={lastName}
          onChange={(e) => handleLastNameChange(e.target.value)}
          placeholder="Enter last name..."
          className="input-glass w-full"
        />

        <div className="typo-caption text-muted-foreground gap-spacing-1 flex items-center">
          <Phone className="icon-xs" />
          <span>Phone</span>
          {savingFields.has('phone') && <Loader className="icon-xs animate-spin" />}
        </div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="Enter phone number..."
          className="input-glass w-full"
        />
      </div>

      {/* Tags */}
      <div className="gap-spacing-3 grid grid-cols-[minmax(100px,auto)_1fr] items-start">
        <div className="typo-caption text-muted-foreground gap-spacing-1 pt-spacing-1 flex items-center">
          <Tag className="icon-xs" />
          <span>Tags</span>
          {savingFields.has('tags') && <Loader className="icon-xs animate-spin" />}
        </div>
        <div className="space-y-spacing-2">
          {/* Current Tags */}
          {contactTags.length > 0 && (
            <div className="gap-spacing-1 flex flex-wrap">
              {contactTags.map((tagName) => {
                const tagDef = tags.find((t) => t.name === tagName)
                return (
                  <span
                    key={tagName}
                    className="gap-spacing-1 px-spacing-2 py-spacing-1 body-4 surface-card border-border inline-flex items-center rounded-full border"
                  >
                    {tagDef && (
                      <span
                        className={`w-spacing-2 h-spacing-2 inline-block rounded-full tintbg-${tagDef.color}`}
                      />
                    )}
                    {tagName}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tagName)}
                      className="text-muted-foreground hover:text-destructive ml-spacing-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Tag Selector Dropdown */}
          <div className="relative" ref={tagDropdownRef}>
            <button
              ref={tagTriggerBtnRef}
              type="button"
              onClick={() => !tagsLoading && setShowTagDropdown(!showTagDropdown)}
              disabled={tagsLoading}
              className="body-3 input-glass flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-muted-foreground">Add a tag...</span>
              <span className="text-muted-foreground">▼</span>
            </button>

            {showTagDropdown &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-tag-dropdown-portal
                  className="bg-card border-border rounded-spacing-2 fixed z-50 flex max-h-[300px] flex-col border shadow-lg"
                  style={{
                    top: tagDropdownPos.top,
                    left: tagDropdownPos.left,
                    width: tagDropdownPos.width,
                  }}
                >
                  <div className="p-spacing-2 border-border border-b">
                    <input
                      ref={tagSearchInputRef}
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="input-glass w-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="p-spacing-1 max-h-[240px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTagDropdown(false)
                        setTagSearch('')
                        setNewTagDialogOpen(true)
                      }}
                      className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle hover:text-foreground body-3 flex w-full items-center text-left transition-all"
                    >
                      <Plus className="icon-sm" />
                      <span className="text-muted-foreground">New Tag</span>
                    </button>

                    {filteredTags.length === 0 ? (
                      <div className="px-spacing-2 py-spacing-4 body-3 text-muted-foreground text-center">
                        No tags found
                      </div>
                    ) : (
                      filteredTags.map((tag) => {
                        const isSelected = contactTags.includes(tag.name)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              handleToggleTag(tag.name)
                            }}
                            className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left transition-all ${
                              isSelected
                                ? 'dropdown-option-selected'
                                : 'hover:bg-hover-subtle hover:text-foreground'
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                                isSelected ? 'step-circle-completed' : 'step-circle-default'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  viewBox="0 0 20 20"
                                  className="tint-green relative z-30 h-2.5 w-2.5"
                                  fill="currentColor"
                                  aria-hidden="true"
                                  style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <span
                              className={`w-spacing-2 h-spacing-2 inline-block rounded-full tintbg-${tag.color}`}
                            />
                            <span
                              className={isSelected ? 'text-foreground' : 'text-muted-foreground'}
                            >
                              {tag.name}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>

                  <div className="px-spacing-3 py-spacing-1 bg-card border-border text-muted-foreground border-t text-center text-xs">
                    {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>

      {/* Custom Fields Section */}
      <details open className="border-border pt-spacing-4 border-t">
        <summary className="typo-caption text-foreground dark:text-primary mb-spacing-3 hover:text-primary cursor-pointer font-medium transition-colors">
          CUSTOM FIELDS
        </summary>

        <div className="gap-spacing-3 pt-spacing-2 grid grid-cols-[minmax(100px,auto)_1fr] items-center">
          {customFieldsLoading ? (
            <div className="gap-spacing-2 body-3 text-muted-foreground col-span-2 flex items-center">
              <Loader className="icon-xs animate-spin" />
              <span>Loading custom fields...</span>
            </div>
          ) : (
            <>
              {customFieldDefinitions
                .filter((field) => field.field_key in customFieldValues)
                .map((field) => {
                  const value = customFieldValues[field.field_key]
                  const isSaving = savingFields.has(`custom_${field.field_key}`)

                  return (
                    <Fragment key={field.id}>
                      <div className="typo-caption text-muted-foreground gap-spacing-1 flex items-center">
                        {field.name}
                        {isSaving && <Loader className="icon-xs animate-spin" />}
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...customFieldValues }
                            delete next[field.field_key]
                            setCustomFieldValues(next)
                            updateContact(contact.id, { custom_fields: next }).then(
                              onContactUpdated,
                            )
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-spacing-1 rounded-spacing-1 transition-colors"
                          title="Remove field"
                        >
                          <X className="icon-xs" />
                        </button>
                      </div>
                      <div>
                        {field.field_type === 'text' && (
                          <input
                            type="text"
                            value={String(value ?? '')}
                            onChange={(e) =>
                              handleCustomFieldChange(field.field_key, e.target.value || null)
                            }
                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                            className="input-glass w-full"
                          />
                        )}

                        {field.field_type === 'number' && (
                          <input
                            type="number"
                            value={String(value ?? '')}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.field_key,
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                            className="input-glass w-full"
                          />
                        )}

                        {field.field_type === 'date' && (
                          <input
                            type="date"
                            value={String(value ?? '')}
                            onChange={(e) =>
                              handleCustomFieldChange(field.field_key, e.target.value || null)
                            }
                            className="input-glass w-full"
                          />
                        )}

                        {field.field_type === 'dropdown' && (
                          <select
                            value={String(value ?? '')}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.field_key,
                                e.target.value === '__none__' ? null : e.target.value,
                              )
                            }
                            className="input-glass w-full"
                          >
                            <option value="__none__">Select {field.name}...</option>
                            {(Array.isArray(field.options) ? field.options : []).map((opt) => (
                              <option key={String(opt)} value={String(opt)}>
                                {String(opt)}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.field_type === 'boolean' && (
                          <div className="gap-spacing-3 flex items-center">
                            <button
                              type="button"
                              onClick={() => handleCustomFieldChange(field.field_key, true)}
                              className={`px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 transition-all ${
                                value === true
                                  ? 'button-glass-accent'
                                  : 'button-glass-neutral text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCustomFieldChange(field.field_key, false)}
                              className={`px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 transition-all ${
                                value === false
                                  ? 'button-glass-accent'
                                  : 'button-glass-neutral text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        )}
                      </div>
                    </Fragment>
                  )
                })}

              {/* Add Field Selector */}
              {(() => {
                const availableFields = customFieldDefinitions.filter(
                  (field) => !(field.field_key in customFieldValues),
                )
                return (
                  <div className="relative col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (availableFields.length === 0) {
                          setNewFieldDialogOpen(true)
                        }
                      }}
                      className="body-3 input-glass gap-spacing-2 text-muted-foreground flex w-full items-center text-left"
                    >
                      <Plus className="icon-xs" />
                      <span>Add custom field...</span>
                    </button>
                    {availableFields.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value === '__create__') {
                            setNewFieldDialogOpen(true)
                            return
                          }
                          const field = customFieldDefinitions.find(
                            (f) => f.field_key === e.target.value,
                          )
                          if (field) {
                            const initialValue =
                              field.field_type === 'boolean'
                                ? false
                                : field.field_type === 'number'
                                  ? 0
                                  : ''
                            handleCustomFieldChange(e.target.value, initialValue)
                          }
                        }}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        <option value="">Add custom field...</option>
                        {availableFields.map((field) => (
                          <option key={field.id} value={field.field_key}>
                            {field.name} ({field.field_type})
                          </option>
                        ))}
                        <option value="__create__">+ Create new field</option>
                      </select>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </details>

      {/* Source & Created */}
      <div className="gap-spacing-3 border-border pt-spacing-4 grid grid-cols-[minmax(100px,auto)_1fr] items-center border-t">
        {contact.source && (
          <>
            <div className="typo-caption text-muted-foreground">Source</div>
            <div className="body-3 text-foreground">{contact.source}</div>
          </>
        )}
        <div className="typo-caption text-muted-foreground">Created</div>
        <div className="body-3 text-foreground">
          {new Date(contact.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* ─── New Tag Dialog ─── */}
      <DialogPrimitive.Root open={newTagDialogOpen} onOpenChange={setNewTagDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Create New Tag</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => setNewTagDialogOpen(false)}
                className="btn-icon-bare btn-close-absolute"
              >
                <X className="icon-sm" />
              </button>
              <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
                <h2 className="title-h6">Create New Tag</h2>
              </div>
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div>
                  <label className="body-3 text-muted-foreground mb-spacing-2 block">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => {
                      setNewTagName(e.target.value)
                      setTagError(null)
                    }}
                    placeholder="e.g., Hot Lead, VIP Customer"
                    maxLength={50}
                    autoFocus
                    className="input-glass w-full"
                  />
                  {tagError && <p className="body-3 text-destructive mt-spacing-1">{tagError}</p>}
                </div>
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex flex-shrink-0 items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => {
                    setNewTagDialogOpen(false)
                    setNewTagName('')
                    setTagError(null)
                  }}
                  disabled={isCreatingTag}
                  className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewTag}
                  disabled={isCreatingTag}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">
                    {isCreatingTag ? 'Creating...' : 'Create Tag'}
                  </span>
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ─── New Custom Field Dialog ─── */}
      <DialogPrimitive.Root open={newFieldDialogOpen} onOpenChange={setNewFieldDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Create Custom Field</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => setNewFieldDialogOpen(false)}
                className="btn-icon-bare btn-close-absolute"
              >
                <X className="icon-sm" />
              </button>
              <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
                <h2 className="title-h6">Create Custom Field</h2>
              </div>
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div>
                  <label className="body-3 text-muted-foreground mb-spacing-2 block">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => {
                      setNewFieldName(e.target.value)
                      setFieldError(null)
                    }}
                    placeholder="e.g., Budget, Lead Score, Industry"
                    maxLength={50}
                    autoFocus
                    className="input-glass w-full"
                  />
                  {fieldError && (
                    <p className="body-3 text-destructive mt-spacing-1">{fieldError}</p>
                  )}
                </div>
                <div>
                  <label className="body-3 text-foreground">Field Type</label>
                  <div className="mt-spacing-2 gap-spacing-2 grid grid-cols-2">
                    {[
                      { value: 'text' as const, label: 'Text', icon: TypeIcon },
                      { value: 'number' as const, label: 'Number', icon: HashIcon },
                      { value: 'date' as const, label: 'Date', icon: Calendar },
                      { value: 'dropdown' as const, label: 'Dropdown', icon: ListIcon },
                      { value: 'boolean' as const, label: 'Yes/No', icon: CheckIcon },
                    ].map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewFieldType(option.value)}
                          className={`p-spacing-3 rounded-spacing-2 gap-spacing-2 flex items-center border text-left transition-all ${
                            newFieldType === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <Icon className="icon-sm text-muted-foreground" />
                          <span className="body-3 text-foreground font-medium">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {newFieldType === 'dropdown' && (
                  <div>
                    <label className="body-3 text-foreground">Dropdown Options</label>
                    <div className="mt-spacing-2 space-y-spacing-2">
                      {newFieldOptions.map((option, idx) => (
                        <div key={idx} className="gap-spacing-2 flex items-center">
                          <div className="px-spacing-3 py-spacing-2 bg-muted/50 rounded-spacing-2 body-3 flex-1">
                            {option}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setNewFieldOptions(newFieldOptions.filter((_, i) => i !== idx))
                            }
                            className="p-spacing-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="icon-xs" />
                          </button>
                        </div>
                      ))}
                      <div className="gap-spacing-2 flex items-center">
                        <input
                          type="text"
                          value={newFieldOptionInput}
                          onChange={(e) => setNewFieldOptionInput(e.target.value)}
                          placeholder="Add option..."
                          className="input-glass flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFieldOptionInput.trim()) {
                              e.preventDefault()
                              setNewFieldOptions([...newFieldOptions, newFieldOptionInput.trim()])
                              setNewFieldOptionInput('')
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newFieldOptionInput.trim()) {
                              setNewFieldOptions([...newFieldOptions, newFieldOptionInput.trim()])
                              setNewFieldOptionInput('')
                            }
                          }}
                          className="button-glass-accent px-spacing-3 py-spacing-1 body-3 rounded-lg font-medium disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex flex-shrink-0 items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => {
                    setNewFieldDialogOpen(false)
                    setNewFieldName('')
                    setNewFieldType('text')
                    setNewFieldOptions([])
                    setNewFieldOptionInput('')
                    setFieldError(null)
                  }}
                  disabled={isCreatingField}
                  className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewField}
                  disabled={isCreatingField}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">
                    {isCreatingField ? 'Creating...' : 'Create Field'}
                  </span>
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
