import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { GoogleDriveModule } from '../../google-drive.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_GOOGLE_DRIVE_ROUTES = [
  'GET integrations/google-drive/status -> status',
  'POST integrations/google-drive/connect -> connect',
  'POST integrations/google-drive/disconnect -> disconnect',
  'GET integrations/google-drive/files -> listFiles',
  'GET integrations/google-drive/shared-drives -> listSharedDrives',
  'GET integrations/google-drive/files/:fileId -> getFile',
  'GET integrations/google-drive/files/:fileId/content -> getFileContent',
  'GET integrations/google-drive/files/:fileId/download -> downloadFile',
  'POST integrations/google-drive/files/upload -> uploadFile',
  'PATCH integrations/google-drive/files/:fileId/rename -> renameFile',
  'POST integrations/google-drive/files/:fileId/share -> shareFile',
  'DELETE integrations/google-drive/files/:fileId -> deleteFile',
  'POST integrations/google-drive/files/google-doc -> createGoogleDoc',
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
    EXPECTED_GOOGLE_DRIVE_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Google Drive controller route order', () => {
  it('keeps the existing Google Drive route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', GoogleDriveModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_GOOGLE_DRIVE_ROUTES)
  })
})
