import Redis from 'ioredis'

async function main() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL required')
  const r = new Redis(url, {
    maxRetriesPerRequest: 1,
    tls: url.startsWith('rediss') ? {} : undefined,
  })
  const keys = await r.keys('*mission*')
  console.log('mission keys', keys.length)
  for (const k of keys.slice(0, 40)) {
    const t = await r.type(k)
    let info = t
    if (t === 'list') info += ` len=${await r.llen(k)}`
    if (t === 'zset') info += ` card=${await r.zcard(k)}`
    if (t === 'hash') info += ` fields=${await r.hlen(k)}`
    if (t === 'stream') info += ` len=${await r.xlen(k)}`
    console.log(k, info)
  }
  const bullKeys = await r.keys('bull:*')
  console.log('bull keys sample', bullKeys.slice(0, 30))
  await r.quit()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
