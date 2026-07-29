'use client'

import { useState } from 'react'
import { WaitlistFormSelect } from '@/components/WaitlistFormSelect'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

const COMPANY_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Company size' },
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '200+', label: '200+ employees' },
]

const GLASS = {
  input: {
    background: 'var(--bg-subtle-hover)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
  },
  buttonGreen: {
    background:
      'linear-gradient(135deg, rgb(var(--accent-emerald-rgb) / 0.15) 0%, rgb(var(--accent-emerald-mid-rgb) / 0.22) 50%, rgb(var(--accent-emerald-rgb) / 0.12) 100%)',
    border: '1px solid rgb(var(--accent-emerald-rgb) / 0.25)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
} as const

export function EnterpriseContactForm({ onDone }: { onDone?: () => void }) {
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
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!API_URL) {
      setError('NEXT_PUBLIC_API_URL is not configured.')
      return
    }
    if (!companySize) {
      setError('Please select a company size.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/enterprise-applications/apply-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          company_name: companyName.trim(),
          company_size: companySize,
          role_title: roleTitle.trim() || undefined,
          use_case: useCase.trim() || undefined,
          team_size: teamSize.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Something went wrong.')
        setLoading(false)
        return
      }
      setSuccess(true)
      onDone?.()
    } catch {
      setError('Could not connect. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-color-muted body-3 mb-4">
          Thank you! We&apos;ll reach out soon to discuss your enterprise needs.
        </p>
        {onDone ? (
          <button
            type="button"
            onClick={() => onDone()}
            className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
            style={GLASS.buttonGreen}
          >
            Got it
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSuccess(false)
              setEmail('')
              setName('')
              setCompanyName('')
              setCompanySize('')
              setRoleTitle('')
              setUseCase('')
              setTeamSize('')
              setPhone('')
              setWebsite('')
            }}
            className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
            style={GLASS.buttonGreen}
          >
            Submit another
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Work email *"
        className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      <input
        type="text"
        required
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Company name *"
        className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      <WaitlistFormSelect
        value={companySize}
        onChange={setCompanySize}
        options={COMPANY_SIZE_OPTIONS}
        placeholder={COMPANY_SIZE_OPTIONS[0].label}
      />
      <input
        type="text"
        value={roleTitle}
        onChange={(e) => setRoleTitle(e.target.value)}
        placeholder="Role / Job title"
        className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      <textarea
        value={useCase}
        onChange={(e) => setUseCase(e.target.value)}
        rows={2}
        placeholder="How do you plan to use ROAS?"
        className="placeholder-dim body-3 w-full resize-none rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={teamSize}
          onChange={(e) => setTeamSize(e.target.value)}
          placeholder="Team size"
          className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
          style={GLASS.input}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
          style={GLASS.input}
        />
      </div>
      <input
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="Company website"
        className="placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
        style={GLASS.input}
      />
      {error && <p className="body-3 text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={GLASS.buttonGreen}
      >
        {loading ? 'Submitting…' : 'Contact Us'}
      </button>
    </form>
  )
}
