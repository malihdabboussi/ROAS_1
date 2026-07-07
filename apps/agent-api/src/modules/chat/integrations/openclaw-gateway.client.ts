import { Injectable } from '@nestjs/common'

@Injectable()
export class OpenClawGatewayClient {
  postResponses(input: {
    gatewayUrl: string
    headers: Record<string, string>
    payload: Record<string, unknown>
    signal: AbortSignal
  }): Promise<Response> {
    return fetch(`${input.gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: input.headers,
      body: JSON.stringify(input.payload),
      signal: input.signal,
    })
  }
}
