import { NextRequest, NextResponse } from 'next/server'
import { buildFormUploadAssetRef } from '@/lib/form-upload-asset-ref'
import { reportFunnelsServerError } from '@/lib/observability/server-error-reporter'
import { resolveFormByToken } from '@/lib/resolve-form'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })

  try {
    const form = await resolveFormByToken(token)
    if (!form) return NextResponse.json({ ok: false, error: 'Form not found' }, { status: 404 })

    const data = await req.formData()
    const file = data.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'upload'
    const filePath = `forms/${form.id}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('media').upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
    if (error) {
      reportFunnelsServerError({
        request: req,
        route: '/api/form-upload',
        feature: 'funnels_form_upload',
        error_code: 'FUNNELS_FORM_UPLOAD_STORAGE_FAILED',
        message: error.message,
        error,
        statusCode: 500,
        context: {
          form_id: form.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
        },
      })
      return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 })
    }

    const { data: signed } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7)
    return NextResponse.json({
      ok: true,
      file: {
        name: file.name,
        path: filePath,
        url: signed?.signedUrl ?? null,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
      asset_ref: buildFormUploadAssetRef({
        formId: form.id,
        filePath,
        url: signed?.signedUrl ?? null,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      }),
    })
  } catch (err) {
    reportFunnelsServerError({
      request: req,
      route: '/api/form-upload',
      feature: 'funnels_form_upload',
      error_code: 'FUNNELS_FORM_UPLOAD_ROUTE_EXCEPTION',
      error: err,
      statusCode: 500,
      context: { token_present: true },
    })
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 })
  }
}
