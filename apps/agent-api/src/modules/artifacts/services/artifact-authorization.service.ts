import { Injectable } from '@nestjs/common'

@Injectable()
export class ArtifactAuthorizationService {
  async authorizeAction(
    target: object,
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return (target as any).authorizeAction(action, data, sessionKey)
  }

  async authorizeSkillTarget(
    target: object,
    userId: string,
    callerAgentKey: string,
    targetAgentKey: string,
    sessionKey?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return (target as any).authorizeSkillTarget(userId, callerAgentKey, targetAgentKey, sessionKey)
  }
}
