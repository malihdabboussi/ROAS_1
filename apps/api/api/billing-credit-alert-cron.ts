interface CronRequest {
  headers: { authorization?: string }
}

interface CronResponse {
  status(code: number): { json(body: Record<string, unknown>): unknown }
}

export default async function handler(req: CronRequest, res: CronResponse) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const configuredUrl =
    process.env.PUBLIC_API_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null)
  if (!configuredUrl) return res.status(503).json({ error: 'Credit alert dispatch unavailable' })

  try {
    const response = await fetch(
      `${configuredUrl.replace(/\/$/, '')}/api/internal/billing-credit-alerts/process-due`,
      { headers: { authorization: `Bearer ${cronSecret}` } },
    )
    if (!response.ok) return res.status(502).json({ error: 'Credit alert dispatch failed' })
    return res.status(200).json({ dispatched: true })
  } catch {
    return res.status(502).json({ error: 'Credit alert dispatch failed' })
  }
}
