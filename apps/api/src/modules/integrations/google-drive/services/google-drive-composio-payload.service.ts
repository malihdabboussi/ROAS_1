import { BadRequestException, Injectable } from '@nestjs/common'

@Injectable()
export class GoogleDriveComposioPayloadService {
  unwrap(value: unknown): unknown {
    let current: unknown = value
    for (let i = 0; i < 4; i += 1) {
      const record = this.asRecord(current)
      if (!record) break
      if (typeof record.error === 'string' && record.error.length > 0) {
        throw new BadRequestException(record.error)
      }
      if (record.successful === false) {
        throw new BadRequestException(
          typeof record.error === 'string' ? record.error : 'Composio tool execution failed',
        )
      }
      if ('data' in record && record.data !== undefined && record.data !== null) {
        current = record.data
        continue
      }
      break
    }
    return current
  }

  asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  asArray(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null
  }

  asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
  }
}
