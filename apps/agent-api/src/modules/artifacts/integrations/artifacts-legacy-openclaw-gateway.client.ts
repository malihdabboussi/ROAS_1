export class ArtifactsLegacyOpenClawGatewayClient {
  postChatCompletions(input: {
    gatewayUrl: string
    headers: Record<string, string>
    body: Record<string, unknown>
    timeoutMs: number
  }): Promise<Response> {
    return this.postGateway(input.gatewayUrl, '/v1/chat/completions', input)
  }

  postResponses(input: {
    gatewayUrl: string
    headers: Record<string, string>
    body: Record<string, unknown>
    timeoutMs: number
  }): Promise<Response> {
    return this.postGateway(input.gatewayUrl, '/v1/responses', input)
  }

  private postGateway(
    gatewayUrl: string,
    path: '/v1/chat/completions' | '/v1/responses',
    input: {
      headers: Record<string, string>
      body: Record<string, unknown>
      timeoutMs: number
    },
  ): Promise<Response> {
    return fetch(`${gatewayUrl}${path}`, {
      method: 'POST',
      headers: input.headers,
      body: JSON.stringify(input.body),
      signal: AbortSignal.timeout(input.timeoutMs),
    })
  }
}
