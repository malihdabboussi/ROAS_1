import { useEffect, useRef, useState } from 'react'
import { useRunner } from 'react-runner'
import { transformTsx } from '@/lib/esbuild-transform'

const cache = new Map<string, string>()

export function useEsbuildRunner({
  code,
  scope,
}: {
  code: string
  scope: Record<string, unknown>
}) {
  const [transformedCode, setTransformedCode] = useState(() => cache.get(code) ?? '')
  const codeRef = useRef(code)

  useEffect(() => {
    if (!code) {
      setTransformedCode('')
      return
    }
    codeRef.current = code
    const cached = cache.get(code)
    if (cached) {
      setTransformedCode(cached)
      return
    }
    transformTsx(code).then((result) => {
      cache.set(code, result)
      if (codeRef.current === code) setTransformedCode(result)
    })
  }, [code])

  return useRunner({ code: transformedCode, scope })
}
