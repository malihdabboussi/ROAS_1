#!/usr/bin/env npx tsx
/**
 * Upload a marketing video to Supabase Storage and return a long-lived signed URL.
 *
 * Usage:  source apps/api/.env && npx tsx apps/website/scripts/upload-marketing-video.mts "/path/to/video.mp4"
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'media'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

async function uploadVideo(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const fileName = path.basename(filePath)
  const fileBuffer = fs.readFileSync(filePath)
  const storagePath = `${SYSTEM_USER_ID}/videos/${Date.now()}-${fileName}`

  console.log(`Uploading ${fileName} to Supabase...`)

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (upErr) {
    console.error(`Upload failed: ${upErr.message}`)
    process.exit(1)
  }

  console.log('Upload successful. Generating signed URL...')

  const { data, error: urlErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 10 * 365 * 24 * 60 * 60) // 10 years

  if (urlErr || !data?.signedUrl) {
    console.error(`Failed to generate signed URL: ${urlErr?.message}`)
    process.exit(1)
  }

  console.log('\n=== VIDEO URL ===\n')
  console.log(data.signedUrl)
  console.log('\n=================\n')
}

const targetPath = process.argv[2]
if (!targetPath) {
  console.error('Usage: npx tsx apps/website/scripts/upload-marketing-video.mts "/path/to/video.mp4"')
  process.exit(1)
}

uploadVideo(targetPath).catch(console.error)
