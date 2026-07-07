import 'reflect-metadata'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } = require('@nestjs/common/constants')

const REQUEST_METHOD_NAMES = new Map([
  [0, 'GET'],
  [1, 'POST'],
  [2, 'PUT'],
  [3, 'DELETE'],
  [4, 'PATCH'],
  [5, 'ALL'],
  [6, 'OPTIONS'],
  [7, 'HEAD'],
])

const ROUTE_DECORATORS = new Map([
  ['Get', 'GET'],
  ['Post', 'POST'],
  ['Put', 'PUT'],
  ['Delete', 'DELETE'],
  ['Patch', 'PATCH'],
  ['All', 'ALL'],
  ['Options', 'OPTIONS'],
  ['Head', 'HEAD'],
  ['Sse', 'GET'],
])

const SOURCE_SKIP_DIRS = new Set(['__tests__', 'dist', 'node_modules'])

function toArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function pathValues(value) {
  if (value === undefined || value === null) return ['']
  if (Array.isArray(value)) return value.flatMap((item) => pathValues(item))
  if (typeof value === 'object' && value !== null && 'path' in value) {
    return pathValues(value.path)
  }
  return [String(value)]
}

function normalizePathPart(value) {
  return String(value ?? '').replace(/^\/+|\/+$/g, '')
}

function joinPathParts(...parts) {
  return parts
    .map((part) => normalizePathPart(part))
    .filter(Boolean)
    .join('/')
}

function withLeadingSlash(path) {
  const normalized = normalizePathPart(path)
  return normalized ? `/${normalized}` : '/'
}

function requestMethodName(value) {
  return REQUEST_METHOD_NAMES.get(value) ?? String(value)
}

function unwrapModule(importedModule) {
  if (!importedModule) return null
  if (typeof importedModule === 'function') return importedModule
  if (typeof importedModule === 'object') {
    if (typeof importedModule.forwardRef === 'function') return importedModule.forwardRef()
    if (typeof importedModule.module === 'function') return importedModule.module
  }
  return null
}

function collectModules(rootModule) {
  const queue = [rootModule]
  const seen = new Set()
  const modules = []

  while (queue.length > 0) {
    const moduleRef = unwrapModule(queue.shift())
    if (!moduleRef || seen.has(moduleRef)) continue

    seen.add(moduleRef)
    modules.push(moduleRef)

    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleRef) ?? []
    for (const imported of imports) {
      const unwrapped = unwrapModule(imported)
      if (unwrapped && !seen.has(unwrapped)) queue.push(unwrapped)
    }
  }

  return modules
}

function normalizeExclusions(exclusions) {
  return toArray(exclusions).map((entry) => ({
    path: normalizePathPart(entry.path),
    method: typeof entry.method === 'number' ? requestMethodName(entry.method) : entry.method,
  }))
}

function isExcluded(rawPath, method, exclusions) {
  const normalizedPath = normalizePathPart(rawPath)
  return exclusions.some((entry) => {
    const samePath = entry.path === normalizedPath
    const sameMethod = entry.method === undefined || entry.method === method
    return samePath && sameMethod
  })
}

function applyGlobalPrefix(rawPath, method, options) {
  const prefix = normalizePathPart(options.globalPrefix ?? '')
  const exclusions = normalizeExclusions(options.exclude ?? [])
  const prefixed = prefix ? joinPathParts(prefix, rawPath) : rawPath
  const finalPath = isExcluded(rawPath, method, exclusions) ? rawPath : prefixed
  return withLeadingSlash(finalPath)
}

function routeEntriesForController(controller, options) {
  const controllerPaths = pathValues(Reflect.getMetadata(PATH_METADATA, controller))
  const prototype = controller.prototype
  const entries = []

  for (const propertyName of Object.getOwnPropertyNames(prototype)) {
    if (propertyName === 'constructor') continue
    const handler = prototype[propertyName]
    if (typeof handler !== 'function') continue

    const methodMetadata = Reflect.getMetadata(METHOD_METADATA, handler)
    if (methodMetadata === undefined) continue

    const method = requestMethodName(methodMetadata)
    const handlerPaths = pathValues(Reflect.getMetadata(PATH_METADATA, handler))

    for (const controllerPath of controllerPaths) {
      for (const handlerPath of handlerPaths) {
        const rawPath = joinPathParts(controllerPath, handlerPath)
        entries.push({
          method,
          path: applyGlobalPrefix(rawPath, method, options),
        })
      }
    }
  }

  return entries
}

export function collectNestRouteInventory(rootModule, options = {}) {
  const routes = []
  for (const moduleRef of collectModules(rootModule)) {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduleRef) ?? []
    for (const controller of controllers) {
      routes.push(...routeEntriesForController(controller, options))
    }
  }

  return routes.sort((a, b) => {
    const pathSort = a.path.localeCompare(b.path)
    return pathSort === 0 ? a.method.localeCompare(b.method) : pathSort
  })
}

export function uniqueRouteKeys(routes) {
  return new Set(routes.map((route) => `${route.method} ${route.path}`))
}

function listControllerSourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out

  for (const entry of readdirSync(dir)) {
    if (SOURCE_SKIP_DIRS.has(entry)) continue
    const fullPath = resolve(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      listControllerSourceFiles(fullPath, out)
      continue
    }
    if (entry.endsWith('.controller.ts') && !entry.endsWith('.test.ts')) {
      out.push(fullPath)
    }
  }

  return out
}

function decoratorsFor(node) {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []
}

function expressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return null
}

function decoratorName(decorator) {
  const expression = decorator.expression
  if (ts.isCallExpression(expression)) return expressionName(expression.expression)
  return expressionName(expression)
}

function objectPathValues(expression, sourceFile) {
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = property.name
    const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null
    if (key === 'path') return sourcePathValues(property.initializer, sourceFile)
  }
  return ['']
}

function sourcePathValues(expression, sourceFile) {
  if (!expression) return ['']
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text]
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) => sourcePathValues(element, sourceFile))
  }
  if (ts.isObjectLiteralExpression(expression)) return objectPathValues(expression, sourceFile)
  return [expression.getText(sourceFile)]
}

function decoratorPathValues(decorator, sourceFile) {
  const expression = decorator.expression
  if (!ts.isCallExpression(expression)) return ['']
  return sourcePathValues(expression.arguments[0], sourceFile)
}

function routeDecoratorFor(node) {
  for (const decorator of decoratorsFor(node)) {
    const name = decoratorName(decorator)
    if (name && ROUTE_DECORATORS.has(name)) {
      return {
        decorator,
        method: ROUTE_DECORATORS.get(name),
      }
    }
  }
  return null
}

function controllerDecoratorFor(node) {
  return decoratorsFor(node).find((decorator) => decoratorName(decorator) === 'Controller')
}

function routeEntriesForSourceFile(filePath, sourceText, options) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const entries = []

  function visit(node) {
    if (ts.isClassDeclaration(node)) {
      const controllerDecorator = controllerDecoratorFor(node)
      if (!controllerDecorator) return

      const controllerPaths = decoratorPathValues(controllerDecorator, sourceFile)
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue
        const routeDecorator = routeDecoratorFor(member)
        if (!routeDecorator) continue

        const handlerPaths = decoratorPathValues(routeDecorator.decorator, sourceFile)
        for (const controllerPath of controllerPaths) {
          for (const handlerPath of handlerPaths) {
            const rawPath = joinPathParts(controllerPath, handlerPath)
            entries.push({
              method: routeDecorator.method,
              path: applyGlobalPrefix(rawPath, routeDecorator.method, options),
            })
          }
        }
      }
      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return entries
}

export function collectSourceRouteInventory(srcDir, options = {}) {
  const routes = []
  for (const filePath of listControllerSourceFiles(srcDir).sort()) {
    routes.push(...routeEntriesForSourceFile(filePath, readFileSync(filePath, 'utf8'), options))
  }

  return routes.sort((a, b) => {
    const pathSort = a.path.localeCompare(b.path)
    return pathSort === 0 ? a.method.localeCompare(b.method) : pathSort
  })
}
