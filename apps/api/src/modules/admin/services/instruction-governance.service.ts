import { Injectable, Logger } from '@nestjs/common'

export type InstructionGovernanceAuditInput = {
  agent_key?: string
  user_id?: string
  org_id?: string
}

@Injectable()
export class InstructionGovernanceService {
  private readonly logger = new Logger(InstructionGovernanceService.name)

  private agentApiBase(): string {
    return (process.env.AGENT_API_URL ?? 'http://localhost:3003').replace(/\/+$/, '')
  }

  private async postAgentApi<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.agentApiBase()}${path}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openclaw-internal': 'true',
      },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`Agent-api ${path} failed (${res.status}): ${text}`)
      throw new Error(`Agent-api request failed (${res.status})`)
    }

    return res.json() as Promise<T>
  }

  audit(input: InstructionGovernanceAuditInput = {}) {
    return this.postAgentApi('/api/agents/instruction-audit', input)
  }

  repair(input: InstructionGovernanceAuditInput = {}) {
    return this.postAgentApi('/api/agents/instruction-repair', input)
  }
}
