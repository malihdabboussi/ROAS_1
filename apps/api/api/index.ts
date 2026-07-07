import type { Request, Response } from 'express'
import type { Express } from 'express'
import { createNestApp } from '../dist/main'

let cachedExpress: Express | null = null

export default async function handler(req: Request, res: Response) {
  if (!cachedExpress) {
    const nestApp = await createNestApp()
    cachedExpress = nestApp.getHttpAdapter().getInstance()
  }
  return cachedExpress(req, res)
}
