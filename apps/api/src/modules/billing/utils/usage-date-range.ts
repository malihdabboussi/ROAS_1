import { BadRequestException } from '@nestjs/common'

export function parseUsageDateRange(
  startDate?: string,
  endDate?: string,
): {
  p_start: string
  p_end: string
} {
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Invalid startDate or endDate')
  }
  if (start.getTime() > end.getTime()) {
    throw new BadRequestException('startDate must be before endDate')
  }
  const maxMs = 366 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxMs) {
    throw new BadRequestException('Date range cannot exceed 366 days')
  }
  return { p_start: start.toISOString(), p_end: end.toISOString() }
}
