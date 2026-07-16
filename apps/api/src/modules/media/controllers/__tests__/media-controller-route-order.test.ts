import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { MediaModule } from '../../media.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_MEDIA_ROUTES = [
  'POST media/upload -> uploadFile',
  'POST media/import-url -> importFromUrl',
  'POST media/campaigns/upload -> uploadCampaignAsset',
  'POST media/presign -> presignUpload',
  'POST media/confirm -> confirmUpload',
  'POST media/cache-instagram-images -> cacheInstagramImages',
  'POST media/cache-social-images -> cacheSocialImages',
  'POST media/generate -> generateImage',
  'GET media/generate/models -> getImageGenerationModels',
  'POST media/generate-stream -> generateImageStream',
  'POST media/edit-image-stream -> editImageStream',
  'POST media/generate-ad-concepts -> generateAdConcepts',
  'GET media/assets -> listAssets',
  'GET media/assets/resolve-by-url -> resolveByUrl',
  'GET media/assets/:id -> getAsset',
  'PATCH media/assets/:id -> updateAsset',
  'POST media/assets/:id/copy -> copyAsset',
  'DELETE media/assets/:id -> deleteAsset',
  'POST media/assets/:id/refresh-url -> refreshUrl',
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
    EXPECTED_MEDIA_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Media controller route order', () => {
  it('keeps the existing media route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', MediaModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_MEDIA_ROUTES)
  })
})
