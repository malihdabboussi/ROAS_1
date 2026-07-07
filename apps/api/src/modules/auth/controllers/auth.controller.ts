import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ZodValidationPipe } from '@vibey/api-shared'
import { ForgotPasswordDto, LoginDto, OAuthDto, RegisterDto } from '../dto/auth.dto'
import { AuthService } from '../services/auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(RegisterDto))
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body.email, body.password)
    if ('error' in result) {
      return { error: result.error, statusCode: result.status }
    }
    return result
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UsePipes(new ZodValidationPipe(LoginDto))
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body.email, body.password)
    if ('error' in result) {
      return { error: result.error, statusCode: result.status }
    }
    return result
  }

  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UsePipes(new ZodValidationPipe(OAuthDto))
  async oauth(@Body() body: OAuthDto) {
    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL env var is required')
    const messageParam = body.message ? `&message=${encodeURIComponent(body.message)}` : ''
    const redirectTo = `${appUrl}/oauth-callback?redirect=/mission-control${messageParam}`

    const result = await this.authService.getOAuthUrl(body.provider, redirectTo)
    if ('error' in result) {
      return { error: result.error, statusCode: result.status }
    }
    return result
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @UsePipes(new ZodValidationPipe(ForgotPasswordDto))
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL env var is required')
    const redirectTo = `${appUrl}/oauth-callback?type=recovery&redirect=${encodeURIComponent('/reset-password')}`

    const result = await this.authService.forgotPassword(body.email, redirectTo)
    if ('error' in result) {
      return { error: result.error, statusCode: result.status }
    }
    return result
  }
}
