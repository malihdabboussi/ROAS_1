import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { ErrorReporter, SupabaseJwtVerifierService, ZodValidationPipe } from '@vibey/api-shared'
import { ClientErrorLogBody, ClientErrorLogSchema } from '../dto/client-error-log.dto'

function sanitizeClientContext(
  input: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, unknown> = {}
  let n = 0
  const maxEntries = 24
  const maxKeyLen = 64
  const maxStr = 800
  for (const [rawKey, rawVal] of Object.entries(input)) {
    if (n >= maxEntries) break
    const key = rawKey.slice(0, maxKeyLen)
    if (typeof rawVal === 'string') out[key] = rawVal.slice(0, maxStr)
    else if (typeof rawVal === 'number' && Number.isFinite(rawVal)) out[key] = rawVal
    else if (typeof rawVal === 'boolean') out[key] = rawVal
    else if (rawVal === null) out[key] = null
    n += 1
  }
  return out
}

function sanitizeClientSourceContext(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return sanitizeClientContext(input ?? undefined)
}

@Controller('log')
@UseGuards(ThrottlerGuard)
export class ClientErrorsController {
  constructor(
    private readonly errorReporter: ErrorReporter,
    private readonly jwtVerifier: SupabaseJwtVerifierService,
  ) {}

  @Post('client-error')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UsePipes(new ZodValidationPipe(ClientErrorLogSchema))
  async reportClientError(
    @Body() body: ClientErrorLogBody,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    const userId = await this.tryResolveUserId(authorization)
    const severity = body.severity ?? 'error'
    const context = sanitizeClientContext(body.context as Record<string, unknown> | undefined)
    this.errorReporter.report({
      app: body.app ?? 'web',
      category: 'ui',
      severity,
      feature: body.feature,
      error_code: body.error_code ?? undefined,
      message: body.message,
      context,
      stack: body.stack ?? undefined,
      component_stack: body.component_stack ?? undefined,
      source_context: sanitizeClientSourceContext(body.source_context),
      url: body.url ?? undefined,
      route: body.route ?? undefined,
      user_id: userId ?? undefined,
      trace_id: body.trace_id ?? undefined,
      message_id: body.message_id ?? undefined,
      request_id: body.request_id ?? undefined,
      run_id: body.run_id ?? undefined,
      conversation_id: body.conversation_id ?? undefined,
    })
  }

  private async tryResolveUserId(authorization?: string): Promise<string | null> {
    const token =
      authorization && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : ''
    if (!token) return null
    const url = process.env.SUPABASE_URL
    if (!url) return null
    const claims = await this.jwtVerifier.verify(token, url).catch(() => null)
    return claims?.sub ?? null
  }
}
