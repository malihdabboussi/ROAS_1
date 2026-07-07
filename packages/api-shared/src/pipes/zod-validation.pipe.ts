import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }))
        throw new BadRequestException({
          message: error.issues[0]?.message || 'Validation failed',
          error: 'Validation failed',
          details: formattedErrors,
        })
      }
      throw new BadRequestException('Validation failed')
    }
  }
}
