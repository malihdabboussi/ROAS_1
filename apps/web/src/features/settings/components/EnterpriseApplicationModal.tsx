'use client'

import { useCallback, useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Crown, Loader2, X } from 'lucide-react'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'

const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '200+'] as const

export function EnterpriseApplicationModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [useCase, setUseCase] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const loadProfile = useCallback(async () => {
    if (profileLoaded) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email ?? '')

    const profile = await backendGet<{
      full_name?: string
      company_name?: string
    }>('/api/profile').catch(() => null)

    if (profile) {
      setName(profile.full_name ?? '')
      if (profile.company_name) setCompanyName(profile.company_name)
    }
    setProfileLoaded(true)
  }, [profileLoaded])

  useEffect(() => {
    if (open) void loadProfile()
  }, [open, loadProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await backendPost<{ success: boolean; alreadyApplied?: boolean }>(
        '/api/enterprise-applications/apply',
        {
          email: email.trim(),
          name: name.trim() || undefined,
          company_name: companyName.trim(),
          company_size: companySize,
          role_title: roleTitle.trim() || undefined,
          use_case: useCase.trim() || undefined,
          team_size: teamSize.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
        },
      )
      if (res.success) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above" />
        <DialogPrimitive.Content className="z-modal-layer-4 fixed inset-0 flex items-center justify-center p-4">
          <div className="surface-card border-border rounded-spacing-4 w-full max-w-lg border shadow-2xl">
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <Crown className="text-muted-foreground h-5 w-5" />
                <DialogPrimitive.Title className="title-h5 text-foreground">
                  Enterprise Application
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Tell us about your company and how your team plans to use ROAS.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="enterprise-email"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    Email
                  </label>
                  <input
                    id="enterprise-email"
                    type="email"
                    value={email}
                    disabled
                    className="input-glass body-2 w-full rounded-lg px-3 py-2 opacity-60"
                  />
                </div>
                <div>
                  <label
                    htmlFor="enterprise-name"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    Full name
                  </label>
                  <input
                    id="enterprise-name"
                    type="text"
                    value={name}
                    disabled
                    className="input-glass body-2 w-full rounded-lg px-3 py-2 opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="enterprise-company"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    Company name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="enterprise-company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-glass body-2 w-full rounded-lg px-3 py-2"
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label
                    htmlFor="enterprise-company-size"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    Company size <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="enterprise-company-size"
                    required
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="input-glass body-2 w-full rounded-lg px-3 py-2"
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="enterprise-role"
                  className="body-3 text-muted-foreground mb-1 block"
                >
                  Role / Job title
                </label>
                <input
                  id="enterprise-role"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="input-glass body-2 w-full rounded-lg px-3 py-2"
                  placeholder="Head of Marketing"
                />
              </div>

              <div>
                <label
                  htmlFor="enterprise-use-case"
                  className="body-3 text-muted-foreground mb-1 block"
                >
                  How do you plan to use ROAS?
                </label>
                <textarea
                  id="enterprise-use-case"
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  rows={3}
                  className="input-glass body-2 w-full resize-none rounded-lg px-3 py-2"
                  placeholder="Multi-brand campaigns, team coordination..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="enterprise-team-size"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    How many team members?
                  </label>
                  <input
                    id="enterprise-team-size"
                    type="text"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="input-glass body-2 w-full rounded-lg px-3 py-2"
                    placeholder="e.g. 15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="enterprise-phone"
                    className="body-3 text-muted-foreground mb-1 block"
                  >
                    Phone number
                  </label>
                  <input
                    id="enterprise-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-glass body-2 w-full rounded-lg px-3 py-2"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="enterprise-website"
                  className="body-3 text-muted-foreground mb-1 block"
                >
                  Company website
                </label>
                <input
                  id="enterprise-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="input-glass body-2 w-full rounded-lg px-3 py-2"
                  placeholder="https://acme.com"
                />
              </div>

              {error && (
                <p role="alert" className="body-3 text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="button-glass-purple body-2 w-full rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
