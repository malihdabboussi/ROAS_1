import { PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

export declare class ZodValidationPipe implements PipeTransform {
  private schema
  constructor(schema: ZodSchema)
  transform(value: unknown): any
}
