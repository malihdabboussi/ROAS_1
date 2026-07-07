'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, ChevronDown, HelpCircle, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { InlineError } from '@/components/ui/feedback/inline-error'
import { Tooltip } from '@/components/ui/tooltip'
import { ALL_COUNTRIES } from '@/lib/constants/countries'
import { cn } from '@/lib/utils/cn'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useEmailDomains } from '../../providers/EmailDomainsProvider'
import { useSenderIdentities } from '../../providers/SenderIdentitiesProvider'

interface AddSenderIdentityDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AddSenderIdentityDialog({ isOpen, onClose }: AddSenderIdentityDialogProps) {
  const { getVerifiedDomains } = useEmailDomains()
  const { addSenderIdentity } = useSenderIdentities()
  const verifiedDomains = getVerifiedDomains()

  const [selectedDomainId, setSelectedDomainId] = useState('')
  const [nickname, setNickname] = useState('')
  const [emailLocalPart, setEmailLocalPart] = useState('')
  const [fromName, setFromName] = useState('')
  const [replyToEmail, setReplyToEmail] = useState('')
  const [replyToName, setReplyToName] = useState('')
  const [address, setAddress] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countrySearchRef = useRef<HTMLInputElement>(null)
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sameAsSenderEmail, setSameAsSenderEmail] = useState(false)

  const selectedDomain = verifiedDomains.find((d) => d.id === selectedDomainId)
  const fullDomain = selectedDomain
    ? selectedDomain.subdomain
      ? `${selectedDomain.subdomain}.${selectedDomain.domain}`
      : selectedDomain.domain
    : ''
  const fullEmail = emailLocalPart && fullDomain ? `${emailLocalPart}@${fullDomain}` : ''

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return ALL_COUNTRIES
    const searchLower = countrySearch.toLowerCase()
    return ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(searchLower))
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
    if (!isOpen) return
    setNickname('')
    setEmailLocalPart('')
    setFromName('')
    setReplyToEmail('')
    setReplyToName('')
    setError(null)
    setSameAsSenderEmail(false)
    setAddress('')
    setAddress2('')
    setCity('')
    setState('')
    setZip('')
    setCountry('')
    const first = verifiedDomains[0]
    if (first) setSelectedDomainId(first.id)
  }, [isOpen])

  useEffect(() => {
    if (sameAsSenderEmail && fullEmail) {
      setReplyToEmail(fullEmail)
    }
  }, [sameAsSenderEmail, fullEmail])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const validateLocalPart = (localPart: string) =>
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)

  const handleLocalPartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim().replace(/@/g, '')
    setEmailLocalPart(value)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDomain) {
      setError('Please select a domain')
      return
    }
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }
    if (!emailLocalPart.trim()) {
      setError('Please enter a sender name (the part before @)')
      return
    }
    if (!validateLocalPart(emailLocalPart)) {
      setError('Please enter a valid sender name (letters, numbers, dots, and hyphens only)')
      return
    }
    if (!fromName.trim()) {
      setError('Please enter a display name')
      return
    }
    if (!replyToEmail.trim()) {
      setError('Please enter a reply-to email')
      return
    }
    if (!validateEmail(replyToEmail)) {
      setError('Please enter a valid reply-to email')
      return
    }
    if (!address.trim()) {
      setError('Please enter a street address')
      return
    }
    if (!city.trim()) {
      setError('Please enter a city')
      return
    }
    if (!country.trim()) {
      setError('Please enter a country')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await addSenderIdentity({
        domainId: selectedDomain.id,
        nickname,
        fromEmail: fullEmail,
        fromName,
        replyToEmail,
        replyToName: replyToName || undefined,
        address,
        address2: address2 || undefined,
        city,
        state: state || undefined,
        zip: zip || undefined,
        country,
      })

      if (result.success) {
        toast.success(EMAIL_MESSAGES.SUCCESS_SENDER_ADDED.message)
        onClose()
      } else {
        const errMsg = result.error || EMAIL_ERRORS.ADD_SENDER_IDENTITY_FAILED.userMessage
        setError(errMsg)
        toast.error(errMsg)
      }
    } catch (err) {
      const errMsg = EMAIL_ERRORS.ADD_SENDER_IDENTITY_FAILED.userMessage
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const avatarLetter = fromName ? fromName.charAt(0).toUpperCase() : 'S'
  const previewName = fromName || 'Your Company'
  const previewEmail = fullEmail || `support@${fullDomain || 'example.com'}`

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{EMAIL_MESSAGES.ADD_SENDER_TITLE.message}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[90vh] sm:max-w-5xl">
            <div className="surface-card wizard-container-border rounded-spacing-4 flex h-full max-h-[90vh] flex-col overflow-hidden">
              {/* Header */}
              <div className="px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">{EMAIL_MESSAGES.ADD_SENDER_TITLE.message}</h2>
                  <button onClick={onClose} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  {EMAIL_MESSAGES.ADD_SENDER_DESCRIPTION.message}
                </p>
              </div>

              {/* Scrollable Content Area */}
              <div className="gap-spacing-2 px-spacing-6 py-spacing-6 flex min-h-0 flex-1">
                {/* Left: Scrollable Form */}
                <div className="pr-spacing-2 min-h-0 min-w-0 flex-1 overflow-y-auto">
                  <form
                    id="sender-identity-form"
                    onSubmit={handleSubmit}
                    className="space-y-spacing-6"
                  >
                    {error && <InlineError message={error} />}

                    {/* Nickname */}
                    <div>
                      <div className="gap-spacing-2 flex items-center">
                        <label className="body-3 text-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_NICKNAME_LABEL.message}
                        </label>
                        <Tooltip label={EMAIL_MESSAGES.ADD_SENDER_NICKNAME_HINT.message} side="top">
                          <span className="inline-flex">
                            <HelpCircle className="text-muted-foreground hover:text-foreground icon-xs cursor-help transition-colors" />
                          </span>
                        </Tooltip>
                      </div>
                      <div className="mt-spacing-2">
                        <input
                          type="text"
                          className="input-glass body-2 h-spacing-10 w-full"
                          placeholder={EMAIL_MESSAGES.ADD_SENDER_NICKNAME_PLACEHOLDER.message}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Domain */}
                    <div>
                      <label className="body-3 text-foreground">Domain</label>
                      <div className="mt-spacing-2">
                        <select
                          className="input-glass body-2 h-spacing-10 w-full"
                          value={selectedDomainId}
                          onChange={(e) => setSelectedDomainId(e.target.value)}
                          disabled={isSubmitting || verifiedDomains.length === 0}
                        >
                          <option value="">Select a domain</option>
                          {verifiedDomains.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain}
                            </option>
                          ))}
                        </select>
                      </div>
                      {verifiedDomains.length === 0 && (
                        <p className="body-3 text-destructive mt-spacing-1">
                          No verified domains available. Please verify a domain first.
                        </p>
                      )}
                    </div>

                    {/* Sender Email */}
                    <div>
                      <label className="body-3 text-foreground">
                        {EMAIL_MESSAGES.ADD_SENDER_EMAIL_LABEL.message}
                      </label>
                      <div className="mt-spacing-2 flex items-stretch">
                        <input
                          type="text"
                          className="input-glass body-2 h-spacing-8 w-sender-email-local rounded-l-spacing-2 flex-shrink-0 rounded-r-none border-r-0"
                          placeholder="support"
                          value={emailLocalPart}
                          onChange={handleLocalPartChange}
                          disabled={isSubmitting || !selectedDomain}
                        />
                        <div className="border-border rounded-r-spacing-2 bg-muted px-spacing-3 body-2 text-muted-foreground flex flex-1 items-center rounded-l-none border border-l-0">
                          @{fullDomain || 'domain.com'}
                        </div>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div>
                      <div className="gap-spacing-2 flex items-center">
                        <label className="body-3 text-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_NAME_LABEL.message}
                        </label>
                        <Tooltip label={EMAIL_MESSAGES.ADD_SENDER_NAME_HINT.message} side="top">
                          <span className="inline-flex">
                            <HelpCircle className="text-muted-foreground hover:text-foreground icon-xs cursor-help transition-colors" />
                          </span>
                        </Tooltip>
                      </div>
                      <div className="mt-spacing-2">
                        <input
                          type="text"
                          className="input-glass body-2 h-spacing-10 w-full"
                          placeholder={EMAIL_MESSAGES.ADD_SENDER_NAME_PLACEHOLDER.message}
                          value={fromName}
                          onChange={(e) => setFromName(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Reply-to */}
                    <div>
                      <div className="gap-spacing-2 flex items-center">
                        <label className="body-3 text-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_REPLY_TO_LABEL.message}
                        </label>
                        <Tooltip label={EMAIL_MESSAGES.ADD_SENDER_REPLY_TO_HINT.message} side="top">
                          <span className="inline-flex">
                            <HelpCircle className="text-muted-foreground hover:text-foreground icon-xs cursor-help transition-colors" />
                          </span>
                        </Tooltip>
                      </div>
                      <div className="mt-spacing-2">
                        <input
                          type="email"
                          className="input-glass body-2 h-spacing-10 w-full"
                          placeholder="reply@example.com"
                          value={replyToEmail}
                          onChange={(e) => {
                            setReplyToEmail(e.target.value.toLowerCase().trim())
                            if (sameAsSenderEmail) setSameAsSenderEmail(false)
                          }}
                          disabled={isSubmitting || sameAsSenderEmail}
                        />
                      </div>
                      <div className="mt-spacing-2 gap-spacing-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSubmitting && fullEmail) {
                              const newVal = !sameAsSenderEmail
                              setSameAsSenderEmail(newVal)
                              if (newVal) setReplyToEmail(fullEmail)
                            }
                          }}
                          disabled={isSubmitting || !fullEmail}
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full transition-all',
                            sameAsSenderEmail ? 'step-circle-completed' : 'step-circle-default',
                            (isSubmitting || !fullEmail) && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          {sameAsSenderEmail && (
                            <Check className="tint-green icon-xs icon-drop-shadow" />
                          )}
                        </button>
                        <span
                          onClick={() => {
                            if (!isSubmitting && fullEmail) {
                              const newVal = !sameAsSenderEmail
                              setSameAsSenderEmail(newVal)
                              if (newVal) setReplyToEmail(fullEmail)
                            }
                          }}
                          className={cn(
                            'body-3 text-muted-foreground select-none',
                            (isSubmitting || !fullEmail) && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          Same as sender email
                        </span>
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="space-y-spacing-4 border-border pt-spacing-4 border-t">
                      <div>
                        <h4 className="body-2 text-foreground font-medium">
                          {EMAIL_MESSAGES.ADD_SENDER_ADDRESS_TITLE.message}
                        </h4>
                        <p className="body-3 text-muted-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_ADDRESS_HINT.message}
                        </p>
                      </div>

                      <div>
                        <label className="body-3 text-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_ADDRESS_LABEL.message}
                        </label>
                        <div className="mt-spacing-2">
                          <input
                            type="text"
                            className="input-glass body-2 h-spacing-10 w-full"
                            placeholder="123 Main Street"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="body-3 text-foreground">Address Line 2 (optional)</label>
                        <div className="mt-spacing-2">
                          <input
                            type="text"
                            className="input-glass body-2 h-spacing-10 w-full"
                            placeholder="Suite 100"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div className="gap-spacing-4 grid grid-cols-3">
                        <div>
                          <label className="body-3 text-foreground">
                            {EMAIL_MESSAGES.ADD_SENDER_CITY_LABEL.message}
                          </label>
                          <div className="mt-spacing-2">
                            <input
                              type="text"
                              className="input-glass body-2 h-spacing-10 w-full"
                              placeholder="New York"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="body-3 text-foreground">
                            {EMAIL_MESSAGES.ADD_SENDER_STATE_LABEL.message}
                          </label>
                          <div className="mt-spacing-2">
                            <input
                              type="text"
                              className="input-glass body-2 h-spacing-10 w-full"
                              placeholder="NY"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="body-3 text-foreground">
                            {EMAIL_MESSAGES.ADD_SENDER_ZIP_LABEL.message}
                          </label>
                          <div className="mt-spacing-2">
                            <input
                              type="text"
                              className="input-glass body-2 h-spacing-10 w-full"
                              placeholder="10001"
                              value={zip}
                              onChange={(e) => setZip(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="body-3 text-foreground">
                          {EMAIL_MESSAGES.ADD_SENDER_COUNTRY_LABEL.message}
                        </label>
                        <div
                          ref={countryDropdownRef}
                          className="mt-spacing-2 flex flex-col-reverse"
                        >
                          {countryDropdownOpen && (
                            <div className="dropdown-menu-solid dropdown-list-scroll mb-spacing-1 rounded-spacing-2 flex flex-col overflow-hidden p-0 shadow-lg outline-none">
                              <div className="border-border flex-shrink-0 border-b">
                                <div className="gap-spacing-2 bg-background p-spacing-2 group flex items-center">
                                  <Search className="icon-sm text-muted-foreground group-focus-within:text-foreground flex-shrink-0 transition-colors" />
                                  <input
                                    ref={countrySearchRef}
                                    type="text"
                                    placeholder="Search country..."
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    className="typo-caption placeholder:text-muted-foreground preview-input flex-1 bg-transparent focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
                                {filteredCountries.length === 0 ? (
                                  <div className="py-spacing-4 text-center">
                                    <p className="body-3 text-muted-foreground">
                                      No countries found
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-spacing-1">
                                    {filteredCountries.map((c) => (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          setCountry(c.name)
                                          setCountryDropdownOpen(false)
                                        }}
                                        className={cn(
                                          'body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left outline-none transition-colors',
                                          country === c.name
                                            ? 'dropdown-option-selected text-muted-foreground'
                                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
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
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setCountryDropdownOpen((o) => !o)}
                            className={cn(
                              'input-glass body-2 h-spacing-10 px-spacing-3 focus:ring-ring flex w-full items-center justify-between text-left outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
                              country ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            <span>{country || 'Select a country'}</span>
                            <ChevronDown
                              className={cn(
                                'icon-sm opacity-50 transition-transform',
                                countryDropdownOpen && 'rotate-180',
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Right: Full Email Preview */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="card-glass rounded-spacing-3 flex h-full flex-col overflow-hidden">
                    {/* Subject */}
                    <div className="border-border px-spacing-6 py-spacing-4 flex-shrink-0 border-b">
                      <h2 className="body-2 text-foreground font-normal">
                        Welcome to our newsletter! 🎉
                      </h2>
                    </div>
                    {/* Sender header */}
                    <div className="border-border px-spacing-6 py-spacing-4 flex-shrink-0 border-b">
                      <div className="gap-spacing-4 flex items-start">
                        <div
                          className={cn(
                            'h-spacing-10 w-spacing-10 body-2 flex flex-shrink-0 items-center justify-center rounded-full font-medium text-white',
                            fromName ? 'avatar-preview-set' : 'avatar-preview-default',
                          )}
                        >
                          {avatarLetter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="gap-spacing-2 flex flex-wrap items-center">
                            <span
                              className={cn(
                                'body-2 font-semibold',
                                fromName ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {previewName}
                            </span>
                            <span className="body-2 text-muted-foreground">
                              &lt;{previewEmail}&gt;
                            </span>
                          </div>
                          <div className="body-3 text-muted-foreground mt-spacing-0-5 gap-spacing-1 flex items-center">
                            <span>to me</span>
                            <svg
                              className="icon-xs"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                        <span className="body-3 text-muted-foreground flex-shrink-0">
                          Dec 1, 2024, 10:32 AM
                        </span>
                      </div>
                    </div>
                    {/* Body - scrolls inside the card */}
                    <div className="px-spacing-6 py-spacing-6 min-h-0 flex-1 overflow-y-auto">
                      <div className="space-y-spacing-4 body-2 text-foreground">
                        <p>Hi there,</p>
                        <p>
                          Thank you for subscribing to our newsletter! We&apos;re excited to have
                          you join our community.
                        </p>
                        <p>Here&apos;s what you can expect from us:</p>
                        <ul className="space-y-spacing-1 pl-spacing-5 list-disc">
                          <li>Weekly tips and insights</li>
                          <li>Exclusive offers and updates</li>
                          <li>Early access to new features</li>
                        </ul>
                        <p>If you have any questions, feel free to reply to this email.</p>
                        <p className="pt-spacing-2">
                          Best regards,
                          <br />
                          <span className={fromName ? 'text-foreground' : 'text-muted-foreground'}>
                            {previewName}
                          </span>
                        </p>
                      </div>
                      <div className="mt-spacing-8 space-y-spacing-2 border-border pt-spacing-6 body-3 text-muted-foreground border-t text-center">
                        <p>You received this email because you subscribed to our newsletter.</p>
                        <p>
                          <a href="#" className="text-primary hover:underline">
                            Unsubscribe
                          </a>
                          {' · '}
                          <a href="#" className="text-primary hover:underline">
                            Manage preferences
                          </a>
                        </p>
                        <div
                          className={cn(
                            'mt-spacing-3',
                            address || city || country
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground/50',
                          )}
                        >
                          <p className="font-medium">{previewName}</p>
                          <p>
                            {address || '123 Main Street'}
                            {address2 && `, ${address2}`}
                          </p>
                          <p>
                            {city || 'City'}
                            {state && `, ${state}`} {zip || '00000'}
                          </p>
                          <p>{country || 'Country'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-border px-spacing-6 py-spacing-4 flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {EMAIL_MESSAGES.ADD_SENDER_BUTTON_CANCEL.message}
                </button>
                <button
                  type="submit"
                  form="sender-identity-form"
                  disabled={
                    isSubmitting ||
                    !selectedDomain ||
                    !nickname ||
                    !emailLocalPart ||
                    !fromName ||
                    !replyToEmail ||
                    !address ||
                    !city ||
                    !country
                  }
                  className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 relative font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="gap-spacing-2 relative z-10 flex items-center">
                    {isSubmitting && <Loader2 className="icon-sm animate-spin" />}
                    {isSubmitting
                      ? EMAIL_MESSAGES.LOADING_ADDING_SENDER.message
                      : EMAIL_MESSAGES.ADD_SENDER_BUTTON_ADD.message}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
