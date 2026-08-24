import { HttpException, HttpStatus } from '@nestjs/common'

export function invalidPageGraderAgencyRequest(details: unknown): never {
  throw new HttpException(
    { success: false, error: 'Invalid request', details },
    HttpStatus.BAD_REQUEST,
  )
}
