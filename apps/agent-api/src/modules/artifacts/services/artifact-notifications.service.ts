import { Injectable } from '@nestjs/common'
import { ArtifactNotificationsRepository } from '../repositories/artifact-notifications.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

@Injectable()
export class ArtifactNotificationsService {
  constructor(
    private readonly repository: ArtifactNotificationsRepository = new ArtifactNotificationsRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      send_user_message: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'sendUserMessage',
          () => this.sendUserMessage(target, data, sessionKey),
          data,
          sessionKey,
        ),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private async sendUserMessage(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const message = String(data.message ?? '').trim()
    if (!message) throw new Error('message is required')

    const userId = target.resolveUserId(sessionKey)
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '')
    if (!agentKey) throw new Error('Failed to resolve agent key from session')

    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null

    await this.repository.insertUserNotification(target.serviceClient, {
      user_id: userId,
      org_id: orgId ?? null,
      type: 'agent_message',
      title: `Message from ${agentKey}`,
      body: message.slice(0, 4000),
      metadata: { agent_key: agentKey, source: 'send_user_message' },
    })

    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const internalToken =
      (target.config.get('INTERNAL_API_TOKEN') as string | undefined) ||
      process.env.INTERNAL_API_TOKEN ||
      ''

    const channelResult: Record<string, unknown> = { in_app: true }

    if (internalToken) {
      try {
        const res = await fetch(`${mainApiUrl}/api/internal/missions/awareness/telegram-push`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${internalToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            agent_key: agentKey,
            content: message,
          }),
        })
        if (res.ok) {
          const body = (await res.json()) as Record<string, unknown>
          if ((body.telegram as Record<string, unknown>)?.ok) channelResult.telegram = true
          if ((body.slack as Record<string, unknown>)?.ok) channelResult.slack = true
        }
      } catch {
        // Channel push is best-effort; in-app notification is already saved
      }
    }

    return { success: true, channels: channelResult }
  }
}
