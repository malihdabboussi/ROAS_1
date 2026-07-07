import { Injectable } from '@nestjs/common'
import type { AgentRuntimeAutoscalerRuntimeConfig } from './agent-runtime-autoscaler.types'

const RAILWAY_GRAPHQL_ENDPOINT = 'https://backboard.railway.app/graphql/v2'

interface RailwayGraphQLError {
  message?: string
}

interface RailwayGraphQLResponse<T> {
  data?: T
  errors?: RailwayGraphQLError[]
}

interface RailwayServiceInstanceResponse {
  serviceInstance?: {
    numReplicas?: number | null
    serviceName?: string | null
  } | null
}

interface RailwayServiceInstanceUpdateResponse {
  serviceInstanceUpdate?: boolean | null
}

@Injectable()
export class RailwayReplicaClient {
  async readCurrentReplicas(config: AgentRuntimeAutoscalerRuntimeConfig): Promise<number> {
    const data = await this.request<RailwayServiceInstanceResponse>(config, {
      query: `
        query serviceInstance($environmentId: String!, $serviceId: String!) {
          serviceInstance(environmentId: $environmentId, serviceId: $serviceId) {
            numReplicas
            serviceName
          }
        }
      `,
      variables: {
        environmentId: config.environmentId,
        serviceId: config.serviceId,
      },
    })

    const replicas = data.serviceInstance?.numReplicas
    if (typeof replicas !== 'number' || !Number.isInteger(replicas) || replicas < 0) {
      throw new Error('Railway serviceInstance response did not include a valid numReplicas')
    }

    return replicas
  }

  async setReplicas(
    config: AgentRuntimeAutoscalerRuntimeConfig,
    targetReplicas: number,
  ): Promise<void> {
    const data = await this.request<RailwayServiceInstanceUpdateResponse>(config, {
      query: `
        mutation serviceInstanceUpdate(
          $environmentId: String
          $serviceId: String!
          $input: ServiceInstanceUpdateInput!
        ) {
          serviceInstanceUpdate(
            environmentId: $environmentId
            serviceId: $serviceId
            input: $input
          )
        }
      `,
      variables: {
        environmentId: config.environmentId,
        serviceId: config.serviceId,
        input: {
          multiRegionConfig: {
            [config.region]: {
              numReplicas: targetReplicas,
            },
          },
        },
      },
    })

    if (data.serviceInstanceUpdate !== true) {
      throw new Error('Railway serviceInstanceUpdate returned false')
    }
  }

  private async request<T>(
    config: AgentRuntimeAutoscalerRuntimeConfig,
    body: { query: string; variables: Record<string, unknown> },
  ): Promise<T> {
    const response = await fetch(RAILWAY_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: this.headers(config),
      body: JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`Railway GraphQL request failed status=${response.status}: ${text}`)
    }

    const parsed = JSON.parse(text) as RailwayGraphQLResponse<T>
    if (parsed.errors?.length) {
      const message = parsed.errors.map((error) => error.message || 'unknown').join('; ')
      throw new Error(`Railway GraphQL error: ${message}`)
    }
    if (!parsed.data) {
      throw new Error('Railway GraphQL response did not include data')
    }
    return parsed.data
  }

  private headers(config: AgentRuntimeAutoscalerRuntimeConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (config.apiTokenType === 'project') {
      headers['Project-Access-Token'] = config.apiToken
    } else {
      headers.Authorization = `Bearer ${config.apiToken}`
    }
    return headers
  }
}
