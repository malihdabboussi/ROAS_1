import { HttpException, HttpStatus } from '@nestjs/common'

type SafeParseSchema<T> = {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { flatten(): unknown } }
}

export function validateWordpressRequest<T>(schema: SafeParseSchema<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HttpException(
      { success: false, error: 'Invalid request', details: result.error.flatten() },
      HttpStatus.BAD_REQUEST,
    )
  }
  return result.data
}
