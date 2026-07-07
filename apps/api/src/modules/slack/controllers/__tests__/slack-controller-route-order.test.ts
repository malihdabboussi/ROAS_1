import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { SlackModule } from '../../slack.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_SLACK_ROUTES = [
  'GET slack/status -> getStatus',
  'POST slack/disconnect -> disconnectIntegration',
  'DELETE slack/remove -> removeIntegration',
  'GET slack/install -> getInstallUrl',
  'GET slack/workspace-channels -> listWorkspaceChannels',
  'POST slack/channel-map -> mapChannel',
  'DELETE slack/disconnect/:agentKey -> disconnect',
  'GET slack/channels -> listChannels',
  'PATCH slack/channel/:agentKey/toggle -> toggleChannel',
  'GET slack/oauth/callback -> callback',
  'POST webhooks/slack/events -> handleEvents',
  'GET integrations/slack/search-messages -> searchMessages',
  'GET integrations/slack/search-files -> searchFiles',
  'GET integrations/slack/channels -> listChannels',
  'GET integrations/slack/users -> listUsers',
  'GET integrations/slack/user-info -> getUserInfo',
  'GET integrations/slack/user-by-email -> findUserByEmail',
  'POST integrations/slack/send-message -> sendMessage',
  'POST integrations/slack/update-message -> updateMessage',
  'POST integrations/slack/delete-message -> deleteMessage',
  'GET integrations/slack/channel-history -> getChannelHistory',
  'GET integrations/slack/thread-replies -> getThreadReplies',
  'POST integrations/slack/add-reaction -> addReaction',
  'POST integrations/slack/remove-reaction -> removeReaction',
  'POST integrations/slack/open-dm -> openDm',
  'POST integrations/slack/upload-file -> uploadFile',
  'GET integrations/slack/file-info -> getFileInfo',
]

function asPath(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function joinRoute(controllerPath: string, methodPath: string): string {
  return [controllerPath, methodPath]
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function collectRoutes(controllers: ControllerType[]): string[] {
  const expectedPaths = new Set(
    EXPECTED_SLACK_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
  )

  return controllers.flatMap((controller) => {
    const controllerPath = asPath(Reflect.getMetadata(PATH_METADATA, controller))
    if (controllerPath === null) return []

    return Object.getOwnPropertyNames(controller.prototype)
      .filter((methodName) => methodName !== 'constructor')
      .map((methodName) => {
        const handler = controller.prototype[methodName]
        if (typeof handler !== 'function') return null

        const methodPath = asPath(Reflect.getMetadata(PATH_METADATA, handler))
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler)
        if (methodPath === null || requestMethod === undefined) return null

        const route = `${METHOD_NAMES[requestMethod]} ${joinRoute(controllerPath, methodPath)}`
        if (!expectedPaths.has(route)) return null
        return `${route} -> ${methodName}`
      })
      .filter((route): route is string => route !== null)
  })
}

describe('Slack controller route order', () => {
  it('keeps the existing Slack route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', SlackModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_SLACK_ROUTES)
  })
})
