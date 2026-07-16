'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'

function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

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

interface OrgOnboardingQuestionsProps {
  orgName: string | null
  onComplete: () => void
  onError: (message: string) => void
}

export function OrgOnboardingQuestions({
  orgName,
  onComplete,
  onError,
}: OrgOnboardingQuestionsProps) {
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const { backendPatch } = await import('@/lib/api/backend-client')
      const { useOrgStore } = await import('@/features/org/store/use-org-store')
      const orgId = useOrgStore.getState().activeOrgId
      if (!orgId) throw new Error('No active organization')

      const websiteNormalized = normalizeWebsiteUrl(website)

      await backendPatch(`/api/org/${orgId}`, {
        website: websiteNormalized || null,
        industry: industry.trim() || null,
        description: description.trim() || null,
      })

      onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to save organization details')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AuthOrbShell
      showHeroOrb={false}
      showQuoteFooter={false}
      panelClassName="card-glass-full container-modal-md w-full"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <h2 className="title-h1 text-foreground mb-spacing-2">
          TELL <span className="vibey-shine-text bg-clip-text text-transparent">VIBEY</span> ABOUT{' '}
          {orgName ? orgName.toUpperCase() : 'YOUR ORGANIZATION'}
        </h2>
        <p className="body-2 text-muted-foreground mb-spacing-6">
          This helps your team&apos;s ROAS research and strategize from day one.
        </p>

        <label className="mb-spacing-3 block">
          <span className="body-2 text-foreground mb-spacing-2 block">Website</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={() => setWebsite(normalizeWebsiteUrl(website))}
            className="input-glass body-2 px-spacing-3 py-spacing-3 w-full"
            placeholder="yourcompany.com"
          />
        </label>

        <div className="mb-spacing-3">
          <span className="body-2 text-foreground mb-spacing-2 block">Industry</span>
          <div className="relative w-full">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="input-glass body-2 gap-spacing-2 px-spacing-3 py-spacing-3 flex w-full items-center justify-between text-left"
            >
              <span className={industry ? 'text-foreground' : 'text-muted-foreground'}>
                {industry || 'Select an industry'}
              </span>
              <ChevronDown
                className={`icon-sm text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {dropdownOpen && (
              <div
                className="mt-spacing-1 z-dropdown absolute left-0 top-full w-full"
                data-dropdown
              >
                <div className="dropdown-menu-solid p-spacing-2 w-full">
                  <div className="dropdown-list-scroll space-y-spacing-0">
                    {INDUSTRY_OPTIONS.map((option) => {
                      const isSelected = industry === option
                      return (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setIndustry(option)
                            setDropdownOpen(false)
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

        <label className="mb-spacing-6 block">
          <span className="body-2 text-foreground mb-spacing-2 block">
            What does the company do?
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-glass body-2 px-spacing-3 py-spacing-3 w-full resize-none"
            rows={3}
            placeholder="Brief description so ROAS can hit the ground running"
          />
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
