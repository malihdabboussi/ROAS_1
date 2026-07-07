import { createHmac, timingSafeEqual } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { CreateAgentRequest, CreateAgentResponse } from '../types/cursor.types'

@Injectable()
export class CursorIntegration {
  private readonly API_BASE = 'https://api.cursor.com'

  private authHeader(apiKey: string): string {
    return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
  }

  async createAgent(apiKey: string, body: CreateAgentRequest): Promise<CreateAgentResponse> {
    const response = await fetch(`${this.API_BASE}/v1/agents`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`Cursor create agent failed (${response.status}): ${raw.slice(0, 500)}`)
    }

    return JSON.parse(raw) as CreateAgentResponse
  }

  async validateApiKey(apiKey: string): Promise<void> {
    const response = await fetch(`${this.API_BASE}/v1/agents?limit=1`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader(apiKey),
        Accept: 'application/json',
      },
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Cursor API key')
    }
    if (!response.ok) {
      const raw = await response.text()
      throw new Error(`Cursor API key validation failed (${response.status}): ${raw.slice(0, 200)}`)
    }
  }

  verifyWebhookSignature(secret: string, rawBody: Buffer, signature: string | undefined): boolean {
    if (!secret || !signature) return false
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
    const expectedBuf = Buffer.from(expected)
    const receivedBuf = Buffer.from(signature)
    if (expectedBuf.length !== receivedBuf.length) return false
    return timingSafeEqual(expectedBuf, receivedBuf)
  }
}
