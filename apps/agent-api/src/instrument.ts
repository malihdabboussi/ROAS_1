import module from 'node:module'
import 'dotenv/config'

if (module.enableCompileCache) {
  try {
    module.enableCompileCache()
  } catch {}
}
