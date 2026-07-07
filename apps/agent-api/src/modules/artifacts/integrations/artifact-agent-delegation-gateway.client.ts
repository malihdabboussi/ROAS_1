export interface ArtifactAgentDelegationGatewayRequest {
  gatewayUrl: string
  gatewayToken: string
  delegationSessionKey: string
  gatewayAgentId: string
  body: Record<string, unknown>
}

export class ArtifactAgentDelegationGatewayClient {
  async openResponsesStream(
    input: ArtifactAgentDelegationGatewayRequest,
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const streamBody = { ...input.body, stream: true }
    const response = await fetch(`${input.gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.gatewayToken}`,
        'x-openclaw-session-key': input.delegationSessionKey,
        'x-openclaw-agent-id': input.gatewayAgentId,
      },
      body: JSON.stringify(streamBody),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Agent gateway responded with ${response.status}: ${errText}`)
    }

    if (!response.body) {
      throw new Error('Agent gateway returned no response body for streaming')
    }

    return response.body.getReader()
  }
}
