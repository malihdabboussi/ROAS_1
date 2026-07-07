import Link from 'next/link'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Building2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react'
import type { OrgInvitation, Organization } from '@/lib/org'

export type InviteState = 'loading' | 'ready' | 'accepting' | 'accepted' | 'error'

export type InviteInvitation = OrgInvitation & { organizations: Organization }

type InviteAcceptHeaderProps = {
  state: InviteState
  invitation: InviteInvitation | null
  error: string | null
}

type InviteAcceptReadyPanelProps = {
  invitation: InviteInvitation
  isLoggedIn: boolean | null
  isExpired: boolean
  isAlreadyAccepted: boolean
  isRevoked: boolean
  lastProvider: string | null
  email: string
  password: string
  message: string | null
  error: string | null
  showPassword: boolean
  token: string
  onAccept: () => void
  onOAuth: (provider: 'google' | 'github') => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onShowPasswordChange: Dispatch<SetStateAction<boolean>>
  onEmailSignUp: (event: FormEvent<HTMLFormElement>) => void
}

export function InviteAcceptHeader({ state, invitation, error }: InviteAcceptHeaderProps) {
  return (
    <div className="mb-spacing-6 text-center">
      <div className="mb-spacing-3 mx-auto flex h-spacing-16 w-spacing-16 items-center justify-center rounded-full bg-primary">
        <Building2 className="h-8 w-8 text-primary-foreground" />
      </div>

      {state === 'loading' && (
        <>
          <h1 className="title-h1 text-foreground">LOADING INVITATION</h1>
          <div className="mt-spacing-4 flex justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        </>
      )}

      {state === 'ready' && invitation && (
        <>
          <h1 className="title-h1 text-foreground">ORGANIZATION INVITE</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            You&apos;ve been invited to join
          </p>
          <p className="body-1 text-foreground mt-spacing-1 font-semibold">
            {invitation.organizations.name}
          </p>
        </>
      )}

      {state === 'accepting' && (
        <>
          <h1 className="title-h1 text-foreground">SETTING UP</h1>
          <div className="mt-spacing-4 flex justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
          <p className="body-2 text-muted-foreground mt-spacing-3">
            I&apos;m getting your workspace ready...
          </p>
        </>
      )}

      {state === 'accepted' && (
        <>
          <h1 className="title-h1 text-foreground">YOU&apos;RE IN</h1>
          <p className="body-2 text-muted-foreground mt-spacing-3">Taking you to setup...</p>
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="title-h1 text-foreground">INVITATION ERROR</h1>
          <div className="mt-spacing-4 flex justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <p className="body-2 text-destructive mt-spacing-3">{error}</p>
        </>
      )}
    </div>
  )
}

export function InviteAcceptReadyPanel({
  invitation,
  isLoggedIn,
  isExpired,
  isAlreadyAccepted,
  isRevoked,
  lastProvider,
  email,
  password,
  message,
  error,
  showPassword,
  token,
  onAccept,
  onOAuth,
  onEmailChange,
  onPasswordChange,
  onShowPasswordChange,
  onEmailSignUp,
}: InviteAcceptReadyPanelProps) {
  return (
    <div className="space-y-spacing-4">
      <div className="rounded-spacing-2 border-border p-spacing-4 border">
        <div className="flex items-center justify-between">
          <span className="body-3 text-muted-foreground">Role</span>
          <span className="body-2 text-foreground font-medium capitalize">{invitation.role}</span>
        </div>
        <div className="mt-spacing-2 flex items-center justify-between">
          <span className="body-3 text-muted-foreground">Expires</span>
          <span className="body-2 text-foreground font-medium">
            {new Date(invitation.expires_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {isExpired && (
        <p className="body-3 text-destructive text-center">
          This invitation has expired. Ask your admin to send a new one.
        </p>
      )}

      {isAlreadyAccepted && (
        <p className="body-3 text-muted-foreground text-center">
          This invitation has already been accepted.
        </p>
      )}

      {isRevoked && (
        <p className="body-3 text-destructive text-center">This invitation has been revoked.</p>
      )}

      {!isExpired && !isAlreadyAccepted && !isRevoked && isLoggedIn && (
        <button type="button" onClick={onAccept} className="button-default button-glass-primary w-full">
          Accept Invitation
        </button>
      )}

      {!isLoggedIn && !isExpired && !isAlreadyAccepted && !isRevoked && (
        <div className="space-y-spacing-4">
          <p className="body-3 text-muted-foreground text-center">
            Create your account to join this workspace.
          </p>

          <div className="gap-spacing-2 flex flex-col">
            <button
              type="button"
              onClick={() => onOAuth('google')}
              aria-label="Sign up with Google"
              className={`${lastProvider === 'google' ? 'chip-glass-blue' : 'button-glass-neutral'} button-default relative w-full`}
            >
              <span className="relative z-10">Google</span>
            </button>
            <button
              type="button"
              onClick={() => onOAuth('github')}
              aria-label="Sign up with GitHub"
              className={`${lastProvider === 'github' ? 'chip-glass-blue' : 'button-glass-neutral'} button-default relative w-full`}
            >
              <span className="relative z-10">GitHub</span>
            </button>
          </div>

          <div className="gap-spacing-3 flex items-center">
            <div className="bg-border h-px flex-1" />
            <span className="body-3 text-muted-foreground">Or sign up with email</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <form onSubmit={onEmailSignUp} className="space-y-spacing-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@domain.com"
              className="input-glass h-spacing-9 rounded-spacing-2 w-full"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Password"
                className="input-glass h-spacing-9 rounded-spacing-2 pr-spacing-8 w-full"
              />
              <button
                type="button"
                onClick={() => onShowPasswordChange((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="icon-md" /> : <Eye className="icon-md" />}
              </button>
            </div>
            {error && <p className="body-3 text-destructive">{error}</p>}
            {message && (
              <div className="body-3 text-foreground border-border rounded-spacing-2 px-spacing-3 py-spacing-2 border text-center">
                {message}
              </div>
            )}
            <button type="submit" className="button-default button-glass-primary w-full">
              <span className="relative z-10">Create account</span>
            </button>
          </form>

          <Link
            href={`/login?redirect=${encodeURIComponent(`/invite/${token}?bootstrap=1`)}`}
            className="body-3 text-muted-foreground hover:text-foreground block w-full text-center"
          >
            Already have an account? Sign in
          </Link>
        </div>
      )}
    </div>
  )
}

export function InviteAcceptErrorFooter() {
  return (
    <div className="mt-spacing-4 text-center">
      <Link href="/home" className="body-3 text-primary underline">
        Go to workspace
      </Link>
    </div>
  )
}
