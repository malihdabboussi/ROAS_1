'use client'

import { useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { adminGet } from '@/lib/api/admin-client'

type Props<T> = {
  title: string
  description: string
  path: string
  render: (data: T) => React.ReactNode
}

export function AdminDataView<T>({ title, description, path, render }: Props<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const result = await adminGet<T>(path)
        setData(result)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Request failed')
      }
    }
    void run()
  }, [path])

  return (
    <section>
      <div className="mb-spacing-6">
        <h1 className="title-h2 text-foreground">{title}</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">{description}</p>
      </div>
      {error ? <p className="body-3 text-destructive">{error}</p> : null}
      {data ? (
        render(data)
      ) : (
        <div className="py-spacing-12 flex min-h-[200px] items-center justify-center">
          <VibeyLoadingOrb text="Loading..." state="processing" size="md" />
        </div>
      )}
    </section>
  )
}
