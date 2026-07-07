import { HttpException, HttpStatus } from '@nestjs/common'
import type { CreditBalance } from './credits.types'

const CREDITS_EXHAUSTED_MESSAGE =
  'You have run out of credits. Please purchase more credits or upgrade your plan.'

export function throwCreditsExhausted(balance: Pick<CreditBalance, 'totalUsed'>): never {
  throw new HttpException(
    {
      error: 'credits_exhausted',
      message: CREDITS_EXHAUSTED_MESSAGE,
      balance: {
        totalAvailable: 0,
        totalUsed: balance.totalUsed,
      },
    },
    HttpStatus.PAYMENT_REQUIRED,
  )
}

export function throwInsufficientCredits(
  balance: Pick<CreditBalance, 'totalAvailable' | 'totalUsed'>,
): never {
  throw new HttpException(
    {
      error: 'credits_exhausted',
      message: CREDITS_EXHAUSTED_MESSAGE,
      balance: {
        totalAvailable: balance.totalAvailable,
        totalUsed: balance.totalUsed,
      },
    },
    HttpStatus.PAYMENT_REQUIRED,
  )
}
