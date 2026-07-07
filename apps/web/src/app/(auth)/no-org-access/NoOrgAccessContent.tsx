'use client'

import { Building2, LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { createClient } from '@/lib/supabase/client'
import { AUTH_MESSAGES } from '../config/auth-messages.config'

export function NoOrgAccessContent() {
  const router = useRouter()
  const copy = AUTH_MESSAGES.NO_ORG_ACCESS

  const checkAgain = () => {
    router.replace('/home')
  }

  const useAnotherAccount = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  return (
    <AuthOrbShell quotes={[...copy.quotes]}>
      <div className="mb-spacing-8 text-center">
        <div className="border-border bg-muted mx-auto mb-spacing-5 flex h-spacing-12 w-spacing-12 items-center justify-center rounded-full border">
          <Building2 aria-hidden="true" className="icon-md text-muted-foreground" />
        </div>
        <h1 className="title-h3 text-foreground font-semibold">{copy.title}</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">{copy.body}</p>
      </div>

      <div className="space-y-spacing-3">
        <button
          type="button"
          onClick={checkAgain}
          className="button-default button-glass-primary w-full"
        >
          <RefreshCw aria-hidden="true" className="icon-sm" />
          <span className="relative z-10">{copy.primaryAction}</span>
        </button>
        <button
          type="button"
          onClick={() => void useAnotherAccount()}
          className="button-default button-glass-neutral w-full"
        >
          <LogOut aria-hidden="true" className="icon-sm" />
          <span className="relative z-10">{copy.secondaryAction}</span>
        </button>
      </div>
    </AuthOrbShell>
  )
}
