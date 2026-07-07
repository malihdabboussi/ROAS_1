import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { WordpressModule } from '../../wordpress.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_WORDPRESS_ROUTES = [
  'GET integrations/wordpress/status -> status',
  'POST integrations/wordpress/connect -> connect',
  'GET integrations/wordpress/oauth/callback -> oauthCallback',
  'GET integrations/wordpress/application-password/callback -> applicationPasswordCallback',
  'POST integrations/wordpress/disconnect -> disconnect',
  'GET integrations/wordpress/posts -> listPosts',
  'POST integrations/wordpress/posts -> createPost',
  'PATCH integrations/wordpress/posts/:postId -> updatePost',
  'POST integrations/wordpress/posts/publish-blog-post -> publishBlogPost',
  'GET integrations/wordpress/pages -> listPages',
  'POST integrations/wordpress/pages -> createPage',
  'PATCH integrations/wordpress/pages/:pageId -> updatePage',
  'POST integrations/wordpress/media -> uploadMedia',
  'GET integrations/wordpress/categories -> listCategories',
  'POST integrations/wordpress/categories -> createCategory',
  'GET integrations/wordpress/tags -> listTags',
  'POST integrations/wordpress/tags -> createTag',
  'GET integrations/wordpress/site -> getSiteInfo',
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
    EXPECTED_WORDPRESS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Wordpress controller route order', () => {
  it('keeps the existing wordpress route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', WordpressModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_WORDPRESS_ROUTES)
  })
})
