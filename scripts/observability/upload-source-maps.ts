import { readFile, readdir, stat } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'observability-source-maps'

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function walkMaps(root: string): Promise<string[]> {
  const out: string[] = []
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await visit(full)
      else if (entry.isFile() && entry.name.endsWith('.map')) out.push(full)
    }
  }
  await visit(root)
  return out
}

function releaseContext() {
  const commitSha =
    process.env.VIBEY_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.SOURCE_VERSION ||
    null
  const releaseId =
    process.env.VIBEY_RELEASE_ID ||
    process.env.NEXT_PUBLIC_VIBEY_RELEASE_ID ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    commitSha ||
    new Date().toISOString().slice(0, 10)
  const buildId =
    process.env.VIBEY_BUILD_ID ||
    process.env.NEXT_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    null
  return { commitSha, releaseId, buildId }
}

async function main() {
  if (process.env.VIBEY_UPLOAD_SOURCE_MAPS !== '1') {
    console.log('source map upload skipped: VIBEY_UPLOAD_SOURCE_MAPS is not 1')
    return
  }

  const app = argValue('--app', 'web')
  const dir = path.resolve(argValue('--dir', '.next'))
  const { releaseId, buildId, commitSha } = releaseContext()
  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  const files = await walkMaps(dir)

  for (const file of files) {
    const relative = path.relative(dir, file).split(path.sep).join('/')
    const storagePath = `${app}/${releaseId}/${buildId ?? 'unknown'}/${relative}`
    const info = await stat(file)
    const body = await readFile(file)
    const upload = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, body, {
        contentType: 'application/json',
        upsert: true,
      })
    if (upload.error) throw new Error(upload.error.message)

    const assetUrl = relative.endsWith('.map') ? relative.slice(0, -'.map'.length) : relative
    const { error } = await supabase.from('source_map_artifacts').upsert(
      {
        app,
        release_id: releaseId,
        build_id: buildId,
        commit_sha: commitSha,
        asset_url: assetUrl,
        source_map_storage_path: storagePath,
        source_root: dir,
        metadata: { size_bytes: info.size },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'app,release_id,asset_url' },
    )
    if (error) throw new Error(error.message)
    console.log(`uploaded ${relative}`)
  }

  console.log(`uploaded ${files.length} source map artifact(s) for ${app}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
