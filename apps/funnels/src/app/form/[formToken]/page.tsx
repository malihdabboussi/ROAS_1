import { notFound } from 'next/navigation'
import { FormRenderer } from '@/components/forms/FormRenderer'
import { resolveFormByToken } from '@/lib/resolve-form'

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ formToken: string }>
  searchParams: Promise<{ embed?: string }>
}) {
  const { formToken } = await params
  const { embed } = await searchParams
  const form = await resolveFormByToken(formToken)
  if (!form) {
    return notFound()
  }
  const resolvedForm = form

  if (resolvedForm.visibility === 'auth') {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-white/60">This form is only available to workspace members.</p>
        </div>
      </main>
    )
  }

  return <FormRenderer form={resolvedForm} embed={embed === '1'} />
}
