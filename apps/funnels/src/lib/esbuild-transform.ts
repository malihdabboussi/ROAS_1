import * as esbuild from 'esbuild-wasm'

const ESBUILD_VERSION = '0.28.0'

let initPromise: Promise<void> | null = null

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = esbuild
      .initialize({
        wasmURL: `https://unpkg.com/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`,
      })
      .catch((err) => {
        initPromise = null
        throw err
      })
  }
  return initPromise
}

export async function transformTsx(code: string): Promise<string> {
  try {
    await ensureInit()
    const result = await esbuild.transform(code, {
      loader: 'tsx',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2020',
    })
    return result.code
  } catch {
    return code
  }
}
