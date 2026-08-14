type SignedPageGraderConnection = {
  userId: string
  orgId: string | null
  webhookSecret: string | null
}

type CatalogClient = { id: string; name: string; display_name?: string }

type VerifiedPageGraderSlackClient = {
  userId: string
  orgId: string | null
  clientId: string
  entry: { campaign_id: string; campaign_name: string }
  webhookSecret: string
}

export async function verifySignedPageGraderSlackClient(input: {
  connections: SignedPageGraderConnection[]
  secret: string
  clientId: string
  clientName?: string
  listClients: (userId: string) => Promise<{ clients: CatalogClient[] }>
  onError: (error: unknown) => void
}) {
  const verified: VerifiedPageGraderSlackClient[] = []
  for (const connection of input.connections) {
    if (connection.webhookSecret !== input.secret) continue
    try {
      const catalog = await input.listClients(connection.userId)
      const client = catalog.clients.find((row) => row.id === input.clientId)
      if (!client) continue
      verified.push({
        userId: connection.userId,
        orgId: connection.orgId,
        clientId: input.clientId,
        entry: {
          campaign_id: '',
          campaign_name:
            input.clientName?.trim() ||
            client.display_name?.trim() ||
            client.name?.trim() ||
            'Client',
        },
        webhookSecret: connection.webhookSecret,
      })
    } catch (error) {
      input.onError(error)
    }
  }
  return verified
}
