import module from 'node:module'
import process from 'node:process'

if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    const cacheDir = process.env.NODE_COMPILE_CACHE?.trim()
    if (cacheDir) {
      module.enableCompileCache(cacheDir)
    } else {
      module.enableCompileCache()
    }
  } catch {
    // Startup must not depend on compile-cache availability.
  }
}
