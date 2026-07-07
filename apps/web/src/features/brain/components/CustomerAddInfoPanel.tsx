'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, Loader2, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { listCrmContacts, type CrmContactRow } from '@/lib/contacts/crm-contacts-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { addCustomerBrainLink, addCustomerBrainText } from '../services/brain.service'
import { useBrainStore } from '../store/use-brain-store'

interface CustomerAddInfoPanelProps {
  visible: boolean
  brainId: string | null
}

type InputMode = 'text' | 'link'

function detectLinkType(url: string): { supported: boolean; platform?: string } {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return { supported: true, platform: 'YouTube' }
  if (lower.includes('linkedin.com')) return { supported: true, platform: 'LinkedIn' }
  if (lower.includes('instagram.com')) return { supported: true, platform: 'Instagram' }
  if (lower.match(/^https?:\/\//)) return { supported: true, platform: 'Web' }
  return { supported: false }
}

export default function CustomerAddInfoPanel({ visible, brainId }: CustomerAddInfoPanelProps) {
  const [open, setOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [submittingText, setSubmittingText] = useState(false)
  const [submittingLink, setSubmittingLink] = useState(false)
  const [linkDetection, setLinkDetection] = useState<ReturnType<typeof detectLinkType> | null>(null)

  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactOptions, setContactOptions] = useState<CrmContactRow[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContact, setSelectedContact] = useState<CrmContactRow | null>(null)
  const contactBtnRef = useRef<HTMLButtonElement>(null)

  const loadGraph = useBrainStore((s) => s.loadGraph)

  useEffect(() => {
    if (!linkUrl.trim()) {
      setLinkDetection(null)
      return
    }
    setLinkDetection(detectLinkType(linkUrl.trim()))
  }, [linkUrl])

  // Load a small contacts page when the picker opens or the search string changes.
  useEffect(() => {
    if (!contactPickerOpen) return
    let cancelled = false
    setLoadingContacts(true)
    listCrmContacts({ limit: 30, search: contactSearch.trim() || undefined })
      .then((res) => {
        if (cancelled) return
        setContactOptions(res.contacts ?? [])
      })
      .catch(() => {
        if (!cancelled) setContactOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false)
      })
    return () => {
      cancelled = true
    }
  }, [contactPickerOpen, contactSearch])

  // Close contact picker on outside clicks.
  useEffect(() => {
    if (!contactPickerOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        contactBtnRef.current &&
        !contactBtnRef.current.contains(target) &&
        !target.closest('[data-contact-picker]')
      ) {
        setContactPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [contactPickerOpen])

  const contactDisplayName = useMemo(() => {
    if (!selectedContact) return null
    const fullName = [selectedContact.first_name, selectedContact.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    return fullName || selectedContact.email || selectedContact.business_name || 'Unnamed contact'
  }, [selectedContact])

  if (!visible) return null

  const handleSubmitText = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = textContent.trim()
    if (!trimmedContent) {
      toast.error('Add some content before saving.')
      return
    }
    setSubmittingText(true)
    try {
      await addCustomerBrainText({
        brainId,
        title: trimmedTitle || null,
        content: trimmedContent,
        contactId: selectedContact?.id ?? null,
      })
      setTitle('')
      setTextContent('')
      toast.success('Saved to customer brain.')
      // Refresh the graph so the new memory shows up immediately.
      if (brainId) void loadGraph(undefined, brainId)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to save memory.'))
    } finally {
      setSubmittingText(false)
    }
  }

  const handleSubmitLink = async () => {
    const trimmedUrl = linkUrl.trim()
    if (!trimmedUrl) {
      toast.error('Paste a URL first.')
      return
    }
    setSubmittingLink(true)
    try {
      await addCustomerBrainLink({
        brainId,
        url: trimmedUrl,
        title: title.trim() || null,
        contactId: selectedContact?.id ?? null,
      })
      setLinkUrl('')
      toast.success('Link saved to customer brain.')
      if (brainId) void loadGraph(undefined, brainId)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to save link.'))
    } finally {
      setSubmittingLink(false)
    }
  }

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="surface-card border-border px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-muted/20 mb-spacing-1 hidden items-center gap-2 rounded-lg border font-medium transition-colors md:flex"
      >
        <Plus className="icon-xs" />
        Add Information
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        className="surface-card border-border w-[340px] rounded-lg border max-md:fixed max-md:inset-x-4 max-md:top-1/2 max-md:z-50 max-md:w-auto max-md:-translate-y-1/2 max-md:shadow-2xl"
        style={{
          maxHeight: open ? '520px' : '0px',
          opacity: open ? 1 : 0,
          overflow: open ? 'visible' : 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="px-spacing-3 py-spacing-3 space-y-spacing-2">
          <p className="body-3 text-foreground font-semibold">Add Information</p>

          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as InputMode)}
            className="space-y-spacing-2"
          >
            <TabsList variant="full">
              <TabsTrigger value="text" className="px-spacing-3">
                Text
              </TabsTrigger>
              <TabsTrigger value="link" className="px-spacing-3">
                Link
              </TabsTrigger>
            </TabsList>

            {/* Contact picker — common to both tabs. Optional; leaving it null means
                the entry lives in the customer brain without a per-contact tag. */}
            <div>
              <label className="body-4 text-muted-foreground mb-spacing-1 block">
                Tag a customer (optional)
              </label>
              <button
                ref={contactBtnRef}
                type="button"
                onClick={() => setContactPickerOpen((p) => !p)}
                className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg text-foreground flex w-full items-center justify-between border"
              >
                <span className="truncate">
                  {contactDisplayName ?? <span className="text-muted-foreground">No contact</span>}
                </span>
                <div className="flex items-center gap-1">
                  {selectedContact && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedContact(null)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="icon-xs" />
                    </span>
                  )}
                  <ChevronDown className="icon-xs text-muted-foreground" />
                </div>
              </button>
              {contactPickerOpen && (
                <div
                  data-contact-picker
                  className="surface-card border-border rounded-spacing-2 mt-spacing-1 p-spacing-2 z-dropdown space-y-spacing-1 absolute right-0 w-[320px] border shadow-lg"
                  style={{ top: 'auto' }}
                >
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search contacts…"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="body-4 box-border h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] pl-7 pr-2 text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {loadingContacts ? (
                      <div className="text-muted-foreground py-spacing-2 flex items-center justify-center">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                    ) : contactOptions.length === 0 ? (
                      <p className="body-4 text-muted-foreground py-spacing-2 text-center">
                        No matching contacts.
                      </p>
                    ) : (
                      contactOptions.map((c) => {
                        const fullName = [c.first_name, c.last_name]
                          .filter(Boolean)
                          .join(' ')
                          .trim()
                        const display = fullName || c.email || c.business_name || 'Unnamed'
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedContact(c)
                              setContactPickerOpen(false)
                            }}
                            className="px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle flex w-full flex-col items-start text-left"
                          >
                            <span className="body-3 text-foreground truncate font-medium">
                              {display}
                            </span>
                            <span className="body-4 text-muted-foreground truncate">
                              {c.email ?? ''}
                              {c.contact_type ? ` · ${c.contact_type}` : ''}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="text" className="space-y-spacing-2 mt-0">
              <input
                type="text"
                placeholder="Title (optional — e.g. 'Maria onboarding notes')"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
              <textarea
                placeholder="Add a note about a customer, a pattern you noticed, a quote…"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="px-spacing-3 py-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full resize-none border"
              />
              <button
                type="button"
                disabled={submittingText || !textContent.trim()}
                onClick={handleSubmitText}
                className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
              >
                {submittingText ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Save to customer brain
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="link" className="space-y-spacing-2 mt-0">
              <input
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
              <div className="relative">
                <input
                  type="url"
                  placeholder="Paste a URL (article, video, social, doc…)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border pr-8"
                />
                {linkUrl && (
                  <button
                    type="button"
                    onClick={() => setLinkUrl('')}
                    className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {linkDetection && (
                <div
                  className={`body-4 rounded-spacing-2 px-spacing-2 py-spacing-2 ${
                    linkDetection.supported
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {linkDetection.platform ?? 'Link'}
                    {linkDetection.supported ? ' detected' : ' — basic save only'}
                  </span>
                </div>
              )}
              <button
                type="button"
                disabled={submittingLink || !linkUrl.trim()}
                onClick={handleSubmitLink}
                className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
              >
                {submittingLink ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Save link
                  </>
                )}
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
