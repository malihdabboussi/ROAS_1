'use strict'
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc)
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r
    return (c > 3 && r && Object.defineProperty(target, key, r), r)
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.SupabaseClientFactory = void 0
const common_1 = require('@nestjs/common')
const supabase_js_1 = require('@supabase/supabase-js')
const supabase_resilient_fetch_1 = require('./supabase-resilient-fetch')
let SupabaseClientFactory = class SupabaseClientFactory {
  supabaseFetch = (0, supabase_resilient_fetch_1.createResilientFetch)({
    label: 'supabase_client_factory',
    maxRetries: 2,
    timeoutMs: 7000,
  })
  createUserClient(token) {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }
    return (0, supabase_js_1.createClient)(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: this.supabaseFetch,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
}
exports.SupabaseClientFactory = SupabaseClientFactory
exports.SupabaseClientFactory = SupabaseClientFactory = __decorate(
  [(0, common_1.Injectable)()],
  SupabaseClientFactory,
)
//# sourceMappingURL=supabase-client.factory.js.map
