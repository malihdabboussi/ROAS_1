import { Module as NodeModule } from 'module'
import path from 'path'
import type { Express, Request, Response } from 'express'

function initNodePathFallbacks() {
  const apiRoot = path.join(__dirname, '..')
  const repoRoot = path.join(apiRoot, '..', '..')
  const candidates = [
    path.join(apiRoot, 'node_modules'),
    path.join(repoRoot, 'node_modules'),
    path.join(repoRoot, 'packages'),
    path.join(repoRoot, 'packages', '@vibey'),
  ]
  const existing = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []
  const merged = [...new Set([...candidates, ...existing])]
  process.env.NODE_PATH = merged.join(path.delimiter)
  ;(NodeModule as any)._initPaths()
}

initNodePathFallbacks()

let cachedExpress: Express | null = null
type ExpressHandler = (req: Request, res: Response) => unknown

export default async function handler(req: Request, res: Response) {
  if (!cachedExpress) {
    const { createNestApp } = await import('../dist/main')
    const nestApp = await createNestApp()
    cachedExpress = nestApp.getHttpAdapter().getInstance()
  }
  return (cachedExpress as unknown as ExpressHandler)(req, res)
}
