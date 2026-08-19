'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { backendPatch } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'

/** Adds https:// when the user omits a scheme (e.g. sefytofan.com). */
function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

function isValidWebsite(raw: string): boolean {
  if (!raw.trim()) return true
  const normalized = normalizeWebsiteUrl(raw)
  try {
    const url = new URL(normalized)
    return url.hostname.includes('.')
  } catch {
    return false
  }
}

const ROLE_OPTIONS = [
  'Founder / CEO',
  'Marketing',
  'Sales',
  'Operations',
  'Product',
  'Engineering',
  'Content Creator',
  'Freelancer / Consultant',
  'Other',
]

const INDUSTRY_OPTIONS = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Coaching & Consulting',
  'Marketing & Advertising',
  'Finance & Fintech',
  'Healthcare & Wellness',
  'Education',
  'Real Estate',
  'Hospitality & Food',
  'Manufacturing',
  'Professional Services',
  'Media & Entertainment',
  'Nonprofit',
  'Other',
]

type OnboardingQuestionsDropdownField = 'role' | 'industry'

function SortStyleSelect({
  field,
  label,
  options,
  value,
  onChange,
  placeholder,
  activeField,
  onActiveFieldChange,
  ariaRequired,
}: {
  field: OnboardingQuestionsDropdownField
  label: string
  options: readonly string[]
  value: string
  onChange: (next: string) => void
  placeholder: string
  activeField: OnboardingQuestionsDropdownField | null
  onActiveFieldChange: (next: OnboardingQuestionsDropdownField | null) => void
  ariaRequired?: boolean
}) {
  const isOpen = activeField === field
  const labelId = `onboarding-${field}-label`
  const triggerId = `onboarding-${field}-trigger`

  return (
    <div className="mb-spacing-3">
      <span className="body-2 text-foreground mb-spacing-2 block" id={labelId}>
        {label}
      </span>
      <div className="relative w-full">
        <button
          type="button"
          id={triggerId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${labelId} ${triggerId}`}
          aria-required={ariaRequired || undefined}
          onClick={() => onActiveFieldChange(isOpen ? null : field)}
          className="input-glass body-2 gap-spacing-2 px-spacing-3 py-spacing-3 flex w-full items-center justify-between text-left"
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`icon-sm text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {isOpen && (
          <div className="mt-spacing-1 z-dropdown absolute left-0 top-full w-full" data-dropdown>
            <div className="dropdown-menu-solid p-spacing-2 w-full">
              <div className="dropdown-list-scroll space-y-spacing-0">
                {options.map((option) => {
                  const isSelected = value === option
                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option)
                        onActiveFieldChange(null)
                      }}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-2 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">{option}</span>
                      {isSelected && (
                        <div className="dropdown-sort-check ml-spacing-2">
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
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface OnboardingQuestionsProps {
  onComplete: () => void
  onError: (message: string) => void
}

export function OnboardingQuestions({ onComplete, onError }: OnboardingQuestionsProps) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [websiteError, setWebsiteError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<OnboardingQuestionsDropdownField | null>(
    null,
  )
  const hydrated = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    void (async () => {
      try {
        const { backendGet } = await import('@/lib/api/backend-client')
        const profile = await backendGet<{
          full_name?: string | null
          industry?: string | null
          website?: string | null
          onboarding_data?: { role?: string; industry?: string } | null
        }>('/api/profile')
        if (profile?.full_name) setFullName(profile.full_name)
        if (profile?.onboarding_data?.role) setRole(profile.onboarding_data.role)
        if (profile?.industry) setIndustry(profile.industry)
        if (profile?.onboarding_data?.industry) setIndustry(profile.onboarding_data.industry)
        if (profile?.website) setWebsite(profile.website)
      } catch {}
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!activeDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fullName.trim() || !role.trim()) return

    if (website.trim() && !isValidWebsite(website)) {
      setWebsiteError('Please enter a valid domain (e.g. yourcompany.com)')
      return
    }
    setWebsiteError(null)
    setIsSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const websiteNormalized = normalizeWebsiteUrl(website)

      await backendPatch('/api/profile/onboarding', {
        full_name: fullName.trim(),
        industry: industry.trim() || null,
        website: websiteNormalized || null,
        onboarding_data: {
          role: role.trim(),
          industry: industry.trim(),
          onboarding_step: 'channels',
        },
      })

      onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to save onboarding answers')
    } finally {
      setIsSaving(false)
    }
  }

  if (!ready) {
    return <div className="surface-bg min-h-dvh w-full" />
  }

  return (
    <AuthOrbShell
      showHeroOrb={false}
      showQuoteFooter={false}
      panelClassName="card-glass-full container-modal-md w-full"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <h2 className="title-h1 text-foreground mb-spacing-2">
          LET <span className="vibey-shine-text bg-clip-text text-transparent">PIXEL</span> LEARN
          ABOUT YOU
        </h2>
        <p className="body-2 text-muted-foreground mb-spacing-6">
          The more Pixel knows, the better it performs.
        </p>

        <label className="mb-spacing-3 block">
          <span className="body-2 text-foreground mb-spacing-2 block">Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="input-glass body-2 px-spacing-3 py-spacing-3 w-full"
            placeholder="What should Pixel call you?"
            required
          />
        </label>

        <SortStyleSelect
          field="role"
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          placeholder="Select a role"
          activeField={activeDropdown}
          onActiveFieldChange={setActiveDropdown}
          ariaRequired
        />

        <SortStyleSelect
          field="industry"
          label="Industry"
          options={INDUSTRY_OPTIONS}
          value={industry}
          onChange={setIndustry}
          placeholder="Select an industry"
          activeField={activeDropdown}
          onActiveFieldChange={setActiveDropdown}
        />

        <label className="mb-spacing-6 block">
          <span className="body-2 text-foreground mb-spacing-2 block">Website</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={website}
            onChange={(event) => {
              setWebsite(event.target.value)
              setWebsiteError(null)
            }}
            onBlur={() => {
              const normalized = normalizeWebsiteUrl(website)
              setWebsite(normalized)
              if (normalized && !isValidWebsite(normalized)) {
                setWebsiteError('Please enter a valid domain (e.g. yourcompany.com)')
              } else {
                setWebsiteError(null)
              }
            }}
            className="input-glass body-2 px-spacing-3 py-spacing-3 w-full"
            placeholder="yourcompany.com"
          />
          {websiteError && <p className="body-4 mt-spacing-1 text-destructive">{websiteError}</p>}
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="chip-glass-green rounded-spacing-2 mt-spacing-2 py-spacing-3 w-full px-4 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="relative z-10">{isSaving ? 'Saving...' : 'Continue'}</span>
        </button>
      </form>
    </AuthOrbShell>
  )
}
