import { Injectable, Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from './supabase-service-client.provider'

interface CachedSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/** Refuse to reuse a token within this window of its expiry. */
const EXPIRY_MARGIN_SECONDS = 120

/**
 * Mints a real GoTrue session for a user so every downstream system (RLS
 * policies, SECURITY DEFINER functions gating on auth.uid(), PostgREST RPCs)
 * sees that identity natively — identical to the user being logged in
 * themselves. Used for superadmin impersonation (AuthGuard) and channel
 * runtimes (Slack/Telegram), which act on behalf of a user without holding
 * their JWT. Sessions are cached per user and reused via refresh token; a
 * fresh mint goes through admin generateLink(magiclink) + verifyOtp.
 */
@Injectable()
export class UserSessionMintService {
  private readonly logger = new Logger(UserSessionMintService.name)
  private readonly cache = new Map<string, CachedSession>()
  private readonly mintInFlight = new Map<string, Promise<CachedSession>>()
  private anonClient: SupabaseClient | null = null

  constructor(private readonly supabaseServiceClient: SupabaseServiceClient) {}

  /**
   * Returns a valid access token for the user. `email` is an optional hint
   * that skips the admin user lookup; when omitted it is resolved via
   * auth.admin.getUserById.
   */
  async mintAccessToken(userId: string, email?: string): Promise<string> {
    const cached = this.cache.get(userId)
    const now = Math.floor(Date.now() / 1000)

    if (cached && cached.expiresAt > now + EXPIRY_MARGIN_SECONDS) {
      return cached.accessToken
    }

    if (cached?.refreshToken) {
      const refreshed = await this.tryRefresh(cached.refreshToken)
      if (refreshed) {
        this.cache.set(userId, refreshed)
        return refreshed.accessToken
      }
    }

    const existing = this.mintInFlight.get(userId)
    if (existing) {
      const session = await existing
      return session.accessToken
    }

    const promise = this.generateViaGoTrue(userId, email)
    this.mintInFlight.set(userId, promise)
    try {
      const session = await promise
      this.cache.set(userId, session)
      return session.accessToken
    } finally {
      this.mintInFlight.delete(userId)
    }
  }

  private getAnonClient(): SupabaseClient {
    if (this.anonClient) return this.anonClient
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }
    this.anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return this.anonClient
  }

  private async tryRefresh(refreshToken: string): Promise<CachedSession | null> {
    try {
      const { data, error } = await this.getAnonClient().auth.refreshSession({
        refresh_token: refreshToken,
      })
      if (error || !data.session) return null
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? refreshToken,
        expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      }
    } catch {
      return null
    }
  }

  private async resolveEmail(userId: string): Promise<string> {
    const { data, error } = await this.supabaseServiceClient.client.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) {
      throw new Error(
        `Session mint: failed to resolve user ${userId}: ${error?.message ?? 'no email on account'}`,
      )
    }
    return data.user.email
  }

  private async generateViaGoTrue(userId: string, emailHint?: string): Promise<CachedSession> {
    const email = emailHint ?? (await this.resolveEmail(userId))

    const { data: linkData, error: linkError } =
      await this.supabaseServiceClient.client.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
    if (linkError || !linkData?.properties?.email_otp) {
      throw new Error(
        `Session mint: failed to generate link for ${userId}: ${linkError?.message ?? 'no OTP returned'}`,
      )
    }

    const { data: session, error: otpError } = await this.getAnonClient().auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    })
    if (otpError || !session?.session?.access_token) {
      throw new Error(
        `Session mint: OTP exchange failed for ${userId}: ${otpError?.message ?? 'no session returned'}`,
      )
    }

    this.logger.log(`Minted session for user ${userId}`)

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token ?? '',
      expiresAt: session.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    }
  }
}
