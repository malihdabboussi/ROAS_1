export interface ArtifactAgentHireReadyInput {
  mainApiUrl: string
  internalToken: string
  userId: string
  orgId: string | null
  roleKey: string
  name?: string
}

export class ArtifactAgentHireApiClient {
  async hireReady(input: ArtifactAgentHireReadyInput): Promise<Record<string, any>> {
    const response = await fetch(`${input.mainApiUrl}/api/internal/agents/hire-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.internalToken ? { Authorization: `Bearer ${input.internalToken}` } : {}),
      },
      body: JSON.stringify({
        user_id: input.userId,
        org_id: input.orgId,
        role_key: input.roleKey,
        name: input.name,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Hire failed')
      throw new Error(`Hire failed: ${errText}`)
    }

    return (await response.json()) as Record<string, any>
  }
}
