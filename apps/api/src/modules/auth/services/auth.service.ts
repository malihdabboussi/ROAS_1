import { Injectable, Logger } from '@nestjs/common'
import { AUTH_ERROR_MESSAGES, resolveAuthRegisterError } from '../config/auth-errors.config'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(private readonly repository: AuthRepository) {}

  async register(email: string, password: string) {
    // Public signups closed unless explicitly re-enabled with NEXT_PUBLIC_WAITLIST_MODE=false
    if (process.env.NEXT_PUBLIC_WAITLIST_MODE !== 'false') {
      return { error: AUTH_ERROR_MESSAGES.PUBLIC_SIGNUP_CLOSED, status: 403 as const }
    }

    const { data, error } = await this.repository.createUser(email, password)

    if (error) {
      this.logger.warn(`Register failed for ${email}: ${error.message}`)
      return resolveAuthRegisterError(error.message)
    }

    const { data: session, error: signInError } = await this.repository.signInWithPassword(
      email,
      password,
    )

    if (signInError) {
      this.logger.warn(`Auto sign-in after register failed: ${signInError.message}`)
      return { error: 'Account created but sign-in failed. Try logging in.', status: 400 }
    }

    return {
      session: {
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      },
      user: { id: data.user?.id, email: data.user?.email },
    }
  }

  async login(email: string, password: string) {
    const { data, error } = await this.repository.signInWithPassword(email, password)

    if (error) {
      this.logger.warn(`Login failed for ${email}: ${error.message}`)
      const msg = error.message.toLowerCase()
      if (msg.includes('invalid login') || msg.includes('invalid')) {
        return { error: 'Invalid email or password.', status: 401 }
      }
      if (msg.includes('email not confirmed') || msg.includes('confirm')) {
        return { error: 'Please verify your email first.', status: 403 }
      }
      return { error: error.message, status: 400 }
    }

    return {
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
      user: { id: data.user?.id, email: data.user?.email },
    }
  }

  async getOAuthUrl(provider: 'google' | 'github', redirectTo: string) {
    const { data, error } = await this.repository.signInWithOAuth(provider, redirectTo)

    if (error) {
      this.logger.warn(`OAuth URL generation failed for ${provider}: ${error.message}`)
      return { error: error.message, status: 400 }
    }

    return { url: data.url }
  }

  async forgotPassword(email: string, redirectTo: string) {
    const { error } = await this.repository.resetPasswordForEmail(email, redirectTo)

    if (error) {
      this.logger.warn(`Forgot password failed for ${email}: ${error.message}`)
      return { error: error.message, status: 400 }
    }

    return { success: true }
  }
}
