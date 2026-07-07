/**
 * Response Filter Service (Layer 2 — Security)
 *
 * Architectural guardrail that scans every outgoing response chunk
 * BEFORE it reaches the user. Redacts sensitive internal information
 * that should never be exposed regardless of prompt instructions.
 */

import { Injectable, Logger } from '@nestjs/common'
import {
  containsUserSecretRequest,
  redactSecretsInText,
  SECRET_REQUEST_BLOCK_MESSAGE,
} from '../utils/secret-redaction.util'

@Injectable()
export class ResponseFilterService {
  private readonly logger = new Logger(ResponseFilterService.name)
  private readonly SAFE_FALLBACK = ''

  /** Patterns that indicate internal/sensitive content */
  private readonly BLOCKED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    // File paths
    { pattern: /\/root\/[^\s"')}\]]+/gi, label: 'file-path' },
    { pattern: /\/opt\/moltbot\/[^\s"')}\]]+/gi, label: 'moltbot-path' },
    { pattern: /\/campaigns\/[^\s"')}\]]+/gi, label: 'campaign-path' },
    { pattern: /\/home\/[^\s"')}\]]+/gi, label: 'home-path' },

    // Internal URLs and services (localhost intentionally excluded — agents legitimately reference user project URLs)
    { pattern: /127\.0\.0\.1:\d+/gi, label: 'loopback' },
    { pattern: /brain-api\.sefytofan\.com/gi, label: 'internal-api' },
    { pattern: /gateway\.govibey\.com/gi, label: 'gateway-url' },

    // Infrastructure terms
    { pattern: /\bOpenClaw\b/gi, label: 'openclaw' },
    { pattern: /\bNestJS\b/gi, label: 'nestjs' },
    { pattern: /\bSupabase\s+service\s*role/gi, label: 'service-role' },
    { pattern: /\bPM2\b/g, label: 'pm2' },
    { pattern: /\bCaddy\b/gi, label: 'caddy' },
    { pattern: /\bcloudflared?\b/gi, label: 'cloudflare-tunnel' },
    { pattern: /\bsystemd\b/gi, label: 'systemd' },

    // Tool names that shouldn't be exposed
    { pattern: /\bsessions_spawn\b/g, label: 'tool-sessions' },
    { pattern: /\bsessions_send\b/g, label: 'tool-sessions' },
    { pattern: /\bsessions_list\b/g, label: 'tool-sessions' },
    { pattern: /\bagents_list\b/g, label: 'tool-agents' },
    { pattern: /\bbrain_crystallize\b/g, label: 'tool-brain' },
    { pattern: /\bbrain_remember\b/g, label: 'tool-brain' },
    { pattern: /\bbrain_forget\b/g, label: 'tool-brain' },
    { pattern: /\bgateway\s+config/gi, label: 'gateway-config' },

    // Secrets/tokens
    { pattern: /\b(sb_secret|sb_publishable)_[A-Za-z0-9_-]+/g, label: 'supabase-key' },
    { pattern: /\b(shpat_|ghp_|sk-or-|nxapi-|sk_)[A-Za-z0-9_-]+/g, label: 'api-token' },
    { pattern: /Bearer\s+[A-Za-z0-9._-]{20,}/g, label: 'bearer-token' },

    // Agent internals
    { pattern: /SOUL\.md/g, label: 'soul-file' },
    { pattern: /AGENTS\.md/g, label: 'agents-file' },
    { pattern: /TOOLS\.md/g, label: 'tools-file' },
    { pattern: /HEARTBEAT\.md/g, label: 'heartbeat-file' },
    { pattern: /metadata\.json/g, label: 'metadata-file' },
    { pattern: /\.env\b/g, label: 'env-file' },

    // Session keys
    { pattern: /agent:[a-z]+:[a-z]+-[a-f0-9-]+/g, label: 'session-key' },

    // Internal debugging / tool narration (product must not say this)
    { pattern: /\bx-session-key\b/gi, label: 'session-key-header' },
    { pattern: /\bsession\s*key\b/gi, label: 'session-key-phrase' },
    { pattern: /\btooling\s+issue\b/gi, label: 'tooling-issue' },
    { pattern: /\bplugin\b/gi, label: 'plugin' },
    { pattern: /\breturning\s+5\d\d\b/gi, label: 'http-5xx' },
    { pattern: /\bhttp\s*5\d\d\b/gi, label: 'http-5xx' },
    { pattern: /\b500\s+errors?\b/gi, label: 'http-500' },
    {
      pattern:
        /\btool\b[^\n]{0,80}\b(not\s+available|isn['’]t\s+available|not\s+being\s+exposed)\b/gi,
      label: 'tool-availability',
    },
    { pattern: /\bvibey_backend\b/g, label: 'internal-tool-name' },
    { pattern: /\bAction\s+"[^"]+"\s+failed:\s*/gi, label: 'tool-failure-prefix' },

    // Agent names (internal)
    {
      pattern: /\bagent:?(main|vibe|wave|atlas|bolt|sage|pixel|aria|finn|echo|nova|pulse)\b/gi,
      label: 'agent-name',
    },

    // UUIDs in prose — skip path/query segments (/.../uuid/..., ?k=uuid) so signed URLs stay valid
    {
      pattern: /(?<![/#?=&])\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      label: 'uuid',
    },

    // Internal API calls in response text
    { pattern: /curl\s+-[sXH]/g, label: 'curl-command' },
    { pattern: /POST\s+http/gi, label: 'http-post' },
    { pattern: /GET\s+http/gi, label: 'http-get' },
    { pattern: /\/api\/internal\//g, label: 'internal-api-path' },
    { pattern: /INTERNAL_TOKEN/g, label: 'internal-token-ref' },
    { pattern: /\$INTERNAL_/g, label: 'internal-env-ref' },

    // API route references (e.g. "/api/artifacts", "POST /api/...")
    { pattern: /\/?api\/[a-z][a-z0-9/_-]*/gi, label: 'api-route' },
    { pattern: /(POST|GET|PUT|PATCH|DELETE)\s+\/[a-z]/gi, label: 'http-method-path' },

    // Technical architecture terms (never user-facing)
    { pattern: /\b(controller|endpoint|middleware|handler|router|guard)\b/gi, label: 'arch-term' },
    { pattern: /\bAuthGuard\b/g, label: 'auth-guard' },
    { pattern: /\bJWT\b/g, label: 'jwt' },
    { pattern: /\bRLS\b/g, label: 'rls' },
    { pattern: /\brow[- ]?level\s+security\b/gi, label: 'rls-full' },
    { pattern: /\bservice[- ]?role\b/gi, label: 'service-role-term' },
    { pattern: /\buser\s+client\b/gi, label: 'user-client' },

    // Code identifiers (camelCase function/method names that look like code)
    {
      pattern:
        /\b(resolve|get|create|update|delete|find|fetch|parse|validate|build|handle)[A-Z][a-zA-Z]+\b/g,
      label: 'code-function',
    },

    // Source file references (*.service.ts, *.controller.ts, etc.)
    {
      pattern:
        /\b\w+\.(service|controller|module|guard|interceptor|pipe|dto|entity|repository)\.(ts|js)\b/g,
      label: 'source-file',
    },

    // Database internals
    {
      pattern: /\b(foreign\s+key|constraint|migration|schema\s+change|schema\s+error)\b/gi,
      label: 'db-internal',
    },

    // Debugging narration phrases
    {
      pattern:
        /\b(endpoint|route|controller)\s+(doesn['']t|does\s+not|isn['']t|is\s+not)\s+accept/gi,
      label: 'debug-narration',
    },
    {
      pattern: /\b(error|bug|issue)\s+(might|could|may)\s+be\s+from\b/gi,
      label: 'debug-narration',
    },
    { pattern: /\breturn(s|ing)\s+a?\s*\d{3}\s+(error|status)/gi, label: 'debug-narration' },
    { pattern: /\bserver\s+(error|is\s+returning|returned)\b/gi, label: 'debug-narration' },
    { pattern: /\binternal\s+(route|endpoint|controller|api|service)\b/gi, label: 'internal-ref' },
    { pattern: /\bagent[- ]?(api|gateway|specific)\b/gi, label: 'agent-internal' },

    // Payload/request/response body references
    { pattern: /\b(request|response)\s+body\b/gi, label: 'http-body' },
    { pattern: /\bpayload\b/gi, label: 'payload' },
    { pattern: /\bslug\b/gi, label: 'slug' },
  ]

  /**
   * Hard-block patterns. When matched, we suppress that chunk entirely and force
   * a safe fallback sentence instead of trying partial redaction.
   */
  private readonly HARD_BLOCK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bx-session-key\b/gi, label: 'session-key-header' },
    { pattern: /\bsession\s*key\b/gi, label: 'session-key-phrase' },
    { pattern: /\bvibey_backend\b/g, label: 'internal-tool-name' },
    { pattern: /\/?api\/[a-z][a-z0-9/_-]*/gi, label: 'api-route' },
    { pattern: /\bagent[- ]?(api|gateway|specific)\b/gi, label: 'agent-internal' },
    {
      pattern:
        /\btool\b[^\n]{0,100}\b(not\s+available|isn['’]t\s+available|not\s+being\s+exposed)\b/gi,
      label: 'tool-availability',
    },
  ]

  /**
   * Patterns kept even in relaxed mode (secrets + internal infra only).
   */
  private readonly RELAXED_KEPT_LABELS = new Set([
    'file-path',
    'moltbot-path',
    'campaign-path',
    'home-path',
    'loopback',
    'internal-api',
    'gateway-url',
    'openclaw',
    'service-role',
    'service-role-term',
    'tool-sessions',
    'tool-agents',
    'tool-brain',
    'supabase-key',
    'api-token',
    'bearer-token',
    'soul-file',
    'agents-file',
    'tools-file',
    'heartbeat-file',
    'env-file',
    'session-key',
    'session-key-header',
    'session-key-phrase',
    'internal-token-ref',
    'internal-env-ref',
    'agent-name',
    'internal-tool-name',
  ])

  /**
   * Filter a single content chunk before sending to user.
   * @param relaxed — When true, only filter secrets and internal infra (for coding agents like Viktor).
   */
  filterChunk(content: string, relaxed = false): string {
    let filtered = redactSecretsInText(this.replaceUserFacingIntegrationNames(content))
    let redactionCount = 0

    for (const { pattern, label } of this.BLOCKED_PATTERNS) {
      if (relaxed && !this.RELAXED_KEPT_LABELS.has(label)) continue
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      if (pattern.test(filtered)) {
        redactionCount++
        this.logger.warn(`[ResponseFilter] Redacted "${label}" from response`)
        // Reset again before replace
        pattern.lastIndex = 0
        filtered = filtered.replace(pattern, '')
      }
    }

    // Clean up any double spaces or orphaned punctuation from redactions
    if (redactionCount > 0) {
      filtered = filtered
        .replace(/\s{2,}/g, ' ')
        .replace(/\(\s*\)/g, '')
        .replace(/\[\s*\]/g, '')
        .trim()
    }

    return redactSecretsInText(filtered)
  }

  private replaceUserFacingIntegrationNames(content: string): string {
    return content
      .replace(/\bscrapecreators(?:[_-]api)?\b/gi, 'Social Analysis')
      .replace(/\bdataforseo(?:[_-]api)?\b/gi, 'SEO Research')
  }

  /**
   * Hard outbound policy gate. If a chunk contains sensitive internal narration,
   * do not stream it to users at all. Caller may emit replacement content once (often empty).
   */
  enforceChunkPolicy(content: string, relaxed = false): { blocked: boolean; content: string } {
    if (containsUserSecretRequest(content)) {
      this.logger.warn('[ResponseFilter] Hard-blocked user secret request in outbound chunk')
      return { blocked: true, content: SECRET_REQUEST_BLOCK_MESSAGE }
    }

    if (!relaxed) {
      for (const { pattern, label } of this.HARD_BLOCK_PATTERNS) {
        pattern.lastIndex = 0
        if (pattern.test(content)) {
          this.logger.warn(`[ResponseFilter] Hard-blocked "${label}" in outbound chunk`)
          return { blocked: true, content: this.SAFE_FALLBACK }
        }
      }
    }

    return { blocked: false, content: this.filterChunk(content, relaxed) }
  }

  /**
   * Filter the complete response after streaming is done.
   * More thorough pass for patterns that span multiple chunks.
   */
  filterComplete(fullContent: string, relaxed = false): string {
    if (containsUserSecretRequest(fullContent)) {
      this.logger.warn('[ResponseFilter] Rewrote user secret request in complete response')
      return SECRET_REQUEST_BLOCK_MESSAGE
    }
    return this.filterChunk(fullContent, relaxed)
  }
}
