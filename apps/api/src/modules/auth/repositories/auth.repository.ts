import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class AuthRepository {
  private readonly serviceClient: SupabaseClient

  constructor() {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.serviceClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  createUser(email: string, password: string) {
    return this.serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  }

  signInWithPassword(email: string, password: string) {
    return this.serviceClient.auth.signInWithPassword({ email, password })
  }

  signInWithOAuth(provider: 'google' | 'github', redirectTo: string) {
    return this.serviceClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    })
  }

  resetPasswordForEmail(email: string, redirectTo: string) {
    return this.serviceClient.auth.resetPasswordForEmail(email, { redirectTo })
  }
}
