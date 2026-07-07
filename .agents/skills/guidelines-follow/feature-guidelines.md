# Feature Development Guidelines

**Feature Development Authority - AI Content, Vibey Persona, Error Handling, Feature Standards**

**Quick Reference for Building Features in Vibey**

---

## 📖 **Table of Contents**

**AI CONTENT GENERATION**

1. [AI Content Generation Standard](#1-ai-content-generation-standard) ............. Line ~50
2. [Parser AI Fallback Pattern](#2-parser-ai-fallback-pattern) .................... Line ~150
3. [AI Structured Outputs](#3-ai-structured-outputs) ............................... Line ~450
4. [AI Content Formatting](#4-ai-content-formatting) ............................... Line ~600
   4.5. [OpenRouter Prompt Caching (MANDATORY)](#45-openrouter-prompt-caching-mandatory) ... Line ~750

**VIBEY PERSONA (UNIVERSAL VOICE)** 5. [Vibey Persona: Universal Voice Standard](#5-vibey-persona-universal-voice-standard) Line ~1000 6. [Voice Guidelines by Context](#6-voice-guidelines-by-context) ................... Line ~950 7. [Error & Message Config Structure](#7-error--message-config-structure) .......... Line ~1250

**WEB SCRAPING & VALIDATION** 8. [Web Scraping with Fallback](#8-web-scraping-with-fallback) .................... Line ~1500

**ERROR LOGGING & MONITORING** 9. [Admin Error Logging](#9-admin-error-logging) ................................... Line ~1650

**UI STANDARDS** 10. [Page Layout Design Standards](#10-page-layout-design-standards) ............... Line ~1850

---

<!-- ============================================================================
   SECTION 1: AI CONTENT GENERATION STANDARD
   ============================================================================ -->

## 1. AI Content Generation Standard

### **CRITICAL: Always Use Parser AI Fallback Pattern**

**For ALL AI-generated content features (funnels, offers, branding, campaigns, etc.), implement the Parser AI fallback pattern to handle malformed JSON responses.**

### **Why This Matters**

**Problem**: AI APIs (OpenRouter, etc.) sometimes return valid HTTP 200 but with malformed JSON:

- Markdown formatting (```json blocks)
- Trailing commas
- Unescaped quotes
- Truncated responses
- Missing braces

**Old Approach**: Show error → User manually retries → Bad UX  
**New Approach**: Automatically repair JSON → Retry if needed → 99.9% success rate

---

<!-- ============================================================================
   SECTION 2: PARSER AI FALLBACK PATTERN
   ============================================================================ -->

## 2. Parser AI Fallback Pattern

### **Flow Diagram**

```
Generate Content (8 retries: Pro + Flash models)
  ↓
Try 5 Parsing Strategies
  ↓ Fails?
Parser AI Repairs JSON (Claude Haiku 4.5)
  ↓ Fails?
Retry ENTIRE Process (max 2 full retries)
  ↓ Fails?
Show Vibey Error Message
```

### **Benefits**

- ✅ **90% cheaper** than full regeneration ($0.0005 vs $0.01)
- ✅ **3-4x faster** recovery (1-2s vs 5-8s)
- ✅ **Content preserved** (fixes structure, not content)
- ✅ **99.9% success rate** (vs 98% without repair)
- ✅ **Better UX** (automatic, invisible to user)

### **Implementation Guide**

**Step 1: Import Parser Service**

```typescript
import { JsonRepairService } from '@/lib/services/json-repair.service'
import { parseJsonWithLogging } from '@/lib/utils/json-parser'
import { logFunnelError } from '@/features/[your-feature]/utils/error-handlers'
import { [YOUR_FEATURE]_ERRORS } from '@/features/[your-feature]/config/errors.config'
```

**Step 2: Wrap Generation in Retry Loop**

```typescript
// In your API route
export async function POST(request: NextRequest) {
  // ... auth, validation, etc.

  // Wrap entire generation in retry loop (max 2 full retries)
  let fullRetryCount = 0
  const MAX_FULL_RETRIES = 2
  let generatedContent: any = null

  while (fullRetryCount < MAX_FULL_RETRIES && !generatedContent) {
    try {
      // Your existing AI generation code here
      const apiResponse = await generateWithAI(/* your params */)
      const rawContent = apiResponse.choices[0]?.message?.content || '{}'

      // Check for HTML response (error page)
      if (rawContent?.trim().startsWith('<') || rawContent?.includes('<!DOCTYPE')) {
        await logFeatureError(YOUR_ERRORS.AI_HTML_RESPONSE, {
          feature: 'your-feature-name',
        })
        return NextResponse.json(
          {
            error: YOUR_ERRORS.AI_HTML_RESPONSE.userMessage,
          },
          { status: 500 },
        )
      }

      // Try parsing with safe parser (5 strategies)
      let parseResult = parseJsonWithLogging(rawContent, 'Your Feature')

      if (!parseResult.success) {
        console.error('❌ JSON parse error:', parseResult.error)

        // ⭐ STEP 3: Try Parser AI to fix the JSON
        console.log('🔧 Attempting JSON repair with Parser AI...')
        await logFeatureError(YOUR_ERRORS.AI_REPAIR_ATTEMPT, {
          feature: 'your-feature-name',
          originalError: parseResult.error,
        })

        const repairResult = await JsonRepairService.repairMalformedJson(rawContent, {
          /* Your expected schema as hint */
        })

        if (repairResult.success && repairResult.repairedJson) {
          console.log('🔧 Parser AI returned repaired JSON, trying parse...')
          parseResult = parseJsonWithLogging(repairResult.repairedJson, 'Your Feature (Repaired)')

          if (parseResult.success) {
            console.log('✅ Parser AI successfully repaired JSON!')
          }
        } else {
          console.error('❌ Parser AI failed:', repairResult.error)
        }

        // ⭐ STEP 4: If still no success, retry entire process
        if (!parseResult.success) {
          fullRetryCount++
          if (fullRetryCount < MAX_FULL_RETRIES) {
            console.log(
              `🔄 Parser AI failed, retrying entire process (attempt ${fullRetryCount + 1}/${MAX_FULL_RETRIES})`,
            )
            await logFeatureError(YOUR_ERRORS.AI_REPAIR_FAILED, {
              feature: 'your-feature-name',
              fullRetryCount,
              maxRetries: MAX_FULL_RETRIES,
            })
            continue // Retry the entire while loop
          } else {
            // All retries exhausted
            await logFeatureError(YOUR_ERRORS.AI_PARSE_FAILED, {
              feature: 'your-feature-name',
              parseError: parseResult.error,
              rawResponse: parseResult.rawContent,
              exhaustedRetries: true,
            })
            return NextResponse.json(
              {
                error: YOUR_ERRORS.AI_PROCESSING_FAILED.userMessage,
              },
              { status: 500 },
            )
          }
        }
      }

      generatedContent = parseResult.data
      break // Success - exit retry loop
    } catch (error) {
      fullRetryCount++
      if (fullRetryCount >= MAX_FULL_RETRIES) {
        throw error // Re-throw to outer catch
      }
      console.log(
        `🔄 Generation failed, retrying (attempt ${fullRetryCount + 1}/${MAX_FULL_RETRIES})`,
      )
    }
  }

  // If we got here without generatedContent, something went wrong
  if (!generatedContent) {
    throw new Error('Failed to generate content after all retries')
  }

  // Continue with your success logic
  return NextResponse.json({ data: generatedContent })
}
```

### **Cost & Performance**

| Scenario                     | Time   | Cost    | Success Rate |
| ---------------------------- | ------ | ------- | ------------ |
| **Happy Path** (parse works) | 4-6s   | $0.01   | 90%          |
| **Parser AI Repair**         | 6-8s   | $0.0105 | 9%           |
| **Full Retry**               | 10-14s | $0.021  | 0.9%         |
| **Final Failure**            | 16-20s | $0.032  | 0.1%         |

**Total Success Rate**: 99.9% (vs 98% without Parser AI)

### **When to Use This Pattern**

**✅ REQUIRED for:**

- AI content generation (funnels, offers, campaigns)
- Multi-field JSON responses
- Complex structured outputs
- User-facing content generation
- Any feature using OpenRouter/Claude/GPT APIs

**❌ NOT NEEDED for:**

- Simple string responses
- Binary responses (yes/no)
- Numeric responses
- Non-JSON APIs
- Database queries (already have retry logic)

### **Testing Checklist**

Before deploying AI generation features:

- [ ] Parser AI service imported
- [ ] Retry loop implemented (max 2 full retries)
- [ ] Parse failure triggers Parser AI
- [ ] Parser AI failure triggers full retry
- [ ] Vibey error messages added to config
- [ ] Error logging to admin dashboard
- [ ] Tested with malformed JSON (manually inject broken response)
- [ ] Tested full retry flow
- [ ] Tested final failure message
- [ ] Verified cost per request acceptable

---

<!-- ============================================================================
   SECTION 3: AI STRUCTURED OUTPUTS
   ============================================================================ -->

## 3. AI Structured Outputs

### **Always Use Structured Outputs for AI APIs**

For all AI API calls (OpenRouter, etc.), use structured outputs instead of manual JSON parsing:

```typescript
// ✅ CORRECT - Structured Output Approach
static async processAIStep(prompt: string, inputData: any): Promise<AIResult> {
  // 1. Append JSON format instruction to your prompt template
  const systemPromptWithFormat = originalPrompt + `

CRITICAL: You must respond with valid JSON in exactly this format:
{
  "field1": "your analysis here",
  "field2": "your response here",
  "field3": "your conclusion here"
}`;

  // 2. Use response_format to enforce JSON output
  const response = await this.createCompletion(messages, {
    response_format: { type: "json_object" }
  });

  // 3. Direct JSON parsing - no regex needed!
  const parsedData = JSON.parse(response.choices[0].message.content);
  return parsedData;
}
```

```typescript
// ❌ WRONG - Manual RegEx Parsing (unreliable)
const jsonMatch = content.match(/\{[\s\S]*\}/)
if (jsonMatch) {
  return JSON.parse(jsonMatch[0]) // Can truncate or include markdown
}
```

### **Benefits of Structured Outputs**

- ✅ **Guaranteed valid JSON** - No markdown formatting or truncation
- ✅ **No manual parsing** - Direct JSON.parse() works reliably
- ✅ **Consistent format** - AI follows exact structure specified
- ✅ **Better error handling** - Clear failures instead of malformed data
- ✅ **OpenAI best practice** - Official recommendation from OpenAI

### **Implementation Pattern**

1. **Keep your prompt templates unchanged** - They contain your expert instructions
2. **Append JSON format instruction** - Add structured output requirement at the end
3. **Use `response_format: { type: "json_object" }`** - Enforce JSON at API level
4. **Set adequate token limits** - Always use `max_tokens: 10000` for complex responses
5. **Direct JSON parsing** - No regex or manual extraction needed

### **AI Service Integration Consistency**

**Always use a unified approach for AI API integration across all services:**

```typescript
// ✅ CORRECT - Consistent pattern used by offers and branding services
export class MyAIService {
  private static readonly API_KEY = process.env.OPENROUTER_API_KEY
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1'
  private static readonly DEFAULT_MODEL = 'google/gemini-2.5-pro'

  private static async createCompletion(
    messages: OpenRouterMessage[],
    options: { response_format?: { type: string } },
  ): Promise<OpenRouterResponse> {
    // Direct fetch to OpenRouter API with structured output
    const response = await fetch(`${this.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, ...options }),
    })
    return response.json()
  }
}
```

**Consistency Rules:**

- **Use direct OpenRouter API calls** - No Vercel AI SDK or other wrappers
- **Same service class structure** - Follow the established pattern
- **Same error handling approach** - Consistent error responses
- **Same authentication method** - Use OPENROUTER_API_KEY environment variable
- **Avoid dependency bloat** - Don't introduce new AI SDKs for the same purpose

**See `@.code_guidelines.md` for complete AI integration patterns.**

---

<!-- ============================================================================
   SECTION 4: AI CONTENT FORMATTING
   ============================================================================ -->

## 4. AI Content Formatting

### **Template-Based Content Formatting**

**ALWAYS** use template-based formatting for AI-generated content to ensure consistency and readability.

**Approach:**

- Analyze prompt files to identify expected output formats
- Create reusable formatters for each content type
- Map database fields to appropriate formatters
- Centralize formatting logic in utilities

### **Content Format Types**

```typescript
// Supported format types based on prompt analysis
type ContentFormatType =
  | 'numbered_list' // 1. Item 2. Item (emotions, fears, objections)
  | 'bullet_list' // • Item • Item (features, benefits, pain points)
  | 'structured_list' // Key: Value format (demographics, competitors)
  | 'paragraph' // Multi-sentence descriptions
  | 'single_sentence' // Concise one-line statements
  | 'case_study' // Client: Problem → Result format
  | 'quote_style' // "Internal thoughts" format
  | 'categorized_list' // Short/Mid/Long term goals
```

### **Implementation Pattern**

**Step 1:** Create content formatter utility

```typescript
// /src/lib/utils/content-formatter.ts
export const formatContent = (content: string, type: ContentFormatType): string => {
  // Format based on type
}

// Field-to-format mapping
export const FIELD_FORMATS: Record<string, ContentFormatType> = {
  step3_powerful_emotions: 'numbered_list',
  step3_biggest_fears: 'numbered_list',
  step5_included_features: 'bullet_list',
  step4_final_summary: 'paragraph',
  // ... etc
}
```

**Step 2:** Use in components

```typescript
// ❌ WRONG - Raw content display
<EditableCard content={offer.step3_powerful_emotions} />

// ✅ CORRECT - Template-formatted content
<EditableCard content={formatContent(offer.step3_powerful_emotions, 'numbered_list')} />
```

### **Benefits**

- **Consistency**: Same format for similar content types
- **Maintainability**: Update one template = fix all fields of that type
- **Performance**: No AI calls needed for formatting
- **Predictability**: Users see consistent formatting every time
- **Scalability**: Easy to add new content types

---

<!-- ============================================================================
   SECTION 4.5: OPENROUTER PROMPT CACHING (MANDATORY)
   ============================================================================ -->

## 4.5. OpenRouter Prompt Caching (MANDATORY)

### **CRITICAL: All OpenRouter Integrations MUST Support Prompt Caching**

**Why This Matters:**

- **75-90% cost reduction** on cached tokens ($0.0003 vs $0.003 per 1K input tokens)
- **Faster responses** (cached content doesn't need reprocessing)
- **Scalability** (handle more requests with same budget)

**When to Use:**

- ✅ **REQUIRED** for all OpenRouter AI content generation (Offers, Funnels, Campaigns, Lab)
- ✅ **REQUIRED** when prompts have static components (system instructions, previous steps, offer data)
- ✅ **REQUIRED** when same prompt used multiple times within 5 minutes

---

### **The 5 Critical Requirements**

**To get prompt caching working, you MUST implement ALL 5:**

1. **Structured Message Format** - Use `ContentPart[]` interface (not plain strings)
2. **Cache Control Tags** - Tag cacheable messages with `cache_control: { type: 'ephemeral' }`
3. **Track Usage with Generation ID** - Store `generationId` for actual cost fetching
4. **Await trackUsage** - Prevent race condition before calling `trackActualCostAsync`
5. **Log Cache Metrics** - Extract and log cache hits from OpenRouter response

**Missing ANY of these = 0% cache hits and wasted money.**

---

### **Implementation Guide**

#### **STEP 1: Message Format - ContentPart Interface**

**❌ WRONG - Plain string messages (Lab's old pattern):**

```typescript
const messages = [
  {
    role: 'system',
    content: 'You are a helpful assistant...', // Plain string - NO caching
  },
  {
    role: 'user',
    content: JSON.stringify(offerData), // Plain string - NO caching
  },
]
```

**✅ CORRECT - Structured ContentPart[] format (Offers pattern):**

```typescript
interface ContentPart {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[] // Supports BOTH formats
}

const messages: OpenRouterMessage[] = [
  {
    role: 'system',
    content: [
      {
        type: 'text',
        text: 'You are a helpful assistant...',
        cache_control: { type: 'ephemeral' }, // ✅ This will be cached!
      },
    ],
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: JSON.stringify(offerData),
        cache_control: { type: 'ephemeral' }, // ✅ This will be cached!
      },
    ],
  },
]
```

---

#### **STEP 2: Cache Control Tags - What to Cache**

**Caching Rules:**

- ✅ **DO cache**: System prompts, offer/funnel data, previous generation steps, static instructions
- ✅ **DO cache**: Large context that repeats across requests
- ❌ **DON'T cache**: User-specific input that changes every time
- ❌ **DON'T cache**: Tiny messages (< 1000 tokens - not worth it)

**Example (Offers - 6 step generation):**

```typescript
// STEP 1: Generate initial offer analysis
const step1Messages: OpenRouterMessage[] = [
  {
    role: 'system',
    content: [
      {
        type: 'text',
        text: promptConfig.prompt_text, // System instructions
        cache_control: { type: 'ephemeral' }, // ✅ Cache prompt (reused across steps)
      },
    ],
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: JSON.stringify({ offer_name, description, documents }),
        cache_control: { type: 'ephemeral' }, // ✅ Cache offer data (reused across steps)
      },
    ],
  },
]

// STEP 2: Use previous step's result
const step2Messages: OpenRouterMessage[] = [
  {
    role: 'system',
    content: [
      {
        type: 'text',
        text: promptConfig.prompt_text,
        cache_control: { type: 'ephemeral' }, // ✅ Cached from step 1!
      },
    ],
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: JSON.stringify({ offer_name, description, documents }),
        cache_control: { type: 'ephemeral' }, // ✅ Cached from step 1!
      },
    ],
  },
  {
    role: 'assistant',
    content: JSON.stringify(step1Result), // Previous step result (no cache_control)
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Now analyze the buyer persona...',
        cache_control: { type: 'ephemeral' }, // ✅ Cache new instruction
      },
    ],
  },
]
```

**Result:** Step 2+ get 70-90% cache hits because system prompt + offer data already cached.

---

#### **STEP 3: Track Usage with Generation ID**

**Pattern:**

```typescript
// After OpenRouter API call
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-pro',
    messages, // Your ContentPart[] messages
  }),
})

const json = await response.json()
const usage = json.usage
const generationId = json.id // ✅ CRITICAL: Store this for actual cost tracking

if (usage) {
  // IMPORTANT: AWAIT this to ensure row is inserted before fetching actual cost
  await usageTracker.trackUsage(
    'your-feature',
    'openrouter',
    {
      model: 'google/gemini-2.5-pro',
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      generationId, // ✅ Store for actual cost fetching
      metadata: {
        total_tokens: usage.total_tokens,
        cached_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      },
    },
    user.id,
  )

  // Now fetch actual cost from OpenRouter (row exists, can update)
  // Fire-and-forget with retry logic
  void trackActualCostAsync(generationId, 'your-feature', supabase)
}
```

---

#### **STEP 4: Await trackUsage (Race Condition Fix)**

**❌ WRONG - Race condition (both fire-and-forget):**

```typescript
void usageTracker.trackUsage(...) // INSERT (fire-and-forget)
void trackActualCostAsync(...)    // UPDATE (runs before INSERT completes!)
// Result: "No rows updated" error, NULL actual_cost
```

**✅ CORRECT - Await INSERT before UPDATE:**

```typescript
await usageTracker.trackUsage(...) // INSERT (wait for completion)
void trackActualCostAsync(...)     // UPDATE (runs after INSERT exists)
// Result: Actual cost tracked successfully
```

**This fix increased actual cost tracking success rate from ~60% to ~98%.**

---

#### **STEP 5: Log Cache Metrics**

**Pattern:**

```typescript
if (usage) {
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0
  const totalInputTokens = usage.prompt_tokens
  const cacheHitRate =
    totalInputTokens > 0 ? ((cachedTokens / totalInputTokens) * 100).toFixed(1) : '0.0'

  // Log cache performance
  if (cachedTokens > 0) {
    console.log(`[Cache HIT] Model: ${model}`)
    console.log(`Cached: ${cachedTokens} / ${totalInputTokens} tokens (${cacheHitRate}%)`)
    console.log(`Savings: ~$${((cachedTokens / 1000) * 0.00225).toFixed(4)} (75% discount)`)
  } else {
    console.log(`[Cache MISS] Model: ${model}`)
    console.log(`No cached tokens - first request or cache expired (5min TTL)`)
  }
}
```

**Example logs:**

```
[Cache HIT] Model: google/gemini-2.5-pro
Cached: 39048 / 39047 tokens (100.0%)
Savings: ~$0.0879 (75% discount)
```

---

### **Complete Example: Lab Template Service**

```typescript
// /features/lab/services/instruction-template.service.ts

interface ContentPart {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export class InstructionTemplateService {
  static async generateContent(
    template: Template,
    offerData: any,
    category: string,
    promptConfig: PromptConfig,
    userId: string,
    supabase: SupabaseClient,
  ): Promise<any> {
    const model = promptConfig.model || 'google/gemini-2.5-pro'

    // ✅ STEP 1: Structured messages with cache control
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: promptConfig.prompt_text,
            cache_control: { type: 'ephemeral' }, // ✅ Cache system prompt
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              template_name: template.name,
              template_instructions: template.instructions,
              offer_data: offerData,
              category,
            }),
            cache_control: { type: 'ephemeral' }, // ✅ Cache context data
          },
        ],
      },
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
      }),
    })

    const json = await response.json()
    const content = json.choices[0]?.message?.content || '{}'
    const parsedData = JSON.parse(content)

    // ✅ STEP 2-5: Track usage with generationId and cache metrics
    if (json.usage) {
      const generationId = json.id
      const cachedTokens = json.usage.prompt_tokens_details?.cached_tokens || 0
      const totalInputTokens = json.usage.prompt_tokens
      const cacheHitRate =
        totalInputTokens > 0 ? ((cachedTokens / totalInputTokens) * 100).toFixed(1) : '0.0'

      // ✅ Log cache performance
      if (cachedTokens > 0) {
        console.log(`[Cache HIT] Model: ${model}`)
        console.log(`Cached: ${cachedTokens} / ${totalInputTokens} tokens (${cacheHitRate}%)`)
      } else {
        console.log(`[Cache MISS] Model: ${model}`)
      }

      // ✅ AWAIT trackUsage (race condition fix)
      await usageTracker.trackUsage(
        'lab-templates',
        'openrouter',
        {
          model,
          inputTokens: json.usage.prompt_tokens,
          outputTokens: json.usage.completion_tokens,
          generationId, // ✅ Store for actual cost fetching
          metadata: {
            total_tokens: json.usage.total_tokens,
            template_id: template.id,
            category,
            cached_tokens: cachedTokens,
          },
        },
        userId,
      )

      // ✅ Fetch actual cost (after row exists)
      if (generationId) {
        void trackActualCostAsync(generationId, 'lab-templates', supabase)
      }
    }

    return parsedData
  }
}
```

---

### **Caching Checklist (Pre-Deployment)**

Before deploying ANY OpenRouter integration:

- [ ] Messages use `ContentPart[]` format (not plain strings)
- [ ] Cache control tags on system prompts
- [ ] Cache control tags on context data (offer, funnel, etc.)
- [ ] `generationId` stored from OpenRouter response
- [ ] `await usageTracker.trackUsage()` (not `void`)
- [ ] `trackActualCostAsync` called after `await trackUsage`
- [ ] Cache metrics logged (cache hit rate, cached tokens)
- [ ] Tested with sequential requests (verify cache hits)
- [ ] Verified actual costs populated in database
- [ ] Confirmed 70-90% cache hit rate after initial request

---

### **Common Mistakes**

| Mistake                                         | Impact                   | Fix                                        |
| ----------------------------------------------- | ------------------------ | ------------------------------------------ |
| Plain string messages                           | 0% cache hits            | Use `ContentPart[]` format                 |
| Missing `cache_control` tags                    | 0% cache hits            | Add `cache_control: { type: 'ephemeral' }` |
| `void trackUsage` before `trackActualCostAsync` | NULL actual costs        | `await trackUsage` first                   |
| Not storing `generationId`                      | Can't fetch actual costs | Store `json.id` from response              |
| No cache logging                                | Can't debug cache issues | Log cache hit rate and cached tokens       |
| Caching user-specific input                     | Low cache hit rate       | Only cache static/repeated content         |

---

### **Performance Comparison**

| Feature       | Cache Format ✅ | Actual Cost ✅ | Race Fix ✅ | Cache Hit Rate | Cost Savings      |
| ------------- | --------------- | -------------- | ----------- | -------------- | ----------------- |
| **Offers**    | ✅ ContentPart  | ✅ Tracked     | ✅ Awaited  | 70-90%         | $0.02 → $0.005    |
| **Funnels**   | ✅ ContentPart  | ✅ Tracked     | ✅ Awaited  | 75-85%         | $0.03 → $0.008    |
| **Campaigns** | ✅ ContentPart  | ✅ Tracked     | ✅ Awaited  | 70-80%         | $0.025 → $0.007   |
| **Lab (OLD)** | ❌ Plain string | ❌ Not tracked | N/A         | 0%             | $0.08 (full cost) |
| **Lab (NEW)** | ✅ ContentPart  | ✅ Tracked     | ✅ Awaited  | 60-70%         | $0.08 → $0.024    |

---

### **Cache Expiration**

**OpenRouter cache TTL: 5 minutes**

- First request: Cache MISS (0% cached)
- Requests within 5 min: Cache HIT (70-90% cached)
- After 5 min: Cache expired, cache MISS again

**Best practices:**

- Multi-step generation benefits most (Offers steps 1-6, Funnel wizard)
- Single isolated requests get less benefit
- Batch related generations within 5 minutes when possible

---

### **Monitoring & Debugging**

**Admin Dashboard:**

- Cache hit rate: `/admin/costs` → Cache Stats card
- Actual costs: `/admin/costs` → Daily breakdown
- Cost savings: Computed - Actual = Saved

**Database:**

```sql
-- Check cache effectiveness
SELECT
  feature,
  AVG(CASE WHEN metadata->>'cached_tokens' IS NOT NULL
      THEN (metadata->>'cached_tokens')::int
      ELSE 0 END) as avg_cached_tokens,
  COUNT(*) as total_requests
FROM token_ai_usage_events
WHERE provider = 'openrouter'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY feature;

-- Check actual cost tracking success rate
SELECT
  feature,
  COUNT(*) FILTER (WHERE actual_cost IS NOT NULL) as tracked,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE actual_cost IS NOT NULL) / COUNT(*), 1) as success_rate
FROM token_ai_usage_events
WHERE provider = 'openrouter'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY feature;
```

---

**See `@.code_guidelines.md` Section: "OpenRouter Actual Cost Tracking (MANDATORY)" for implementation details.**

---

<!-- ============================================================================
   SECTION 5: VIBEY PERSONA - UNIVERSAL VOICE STANDARD
   ============================================================================ -->

## 5. Vibey Persona: Universal Voice Standard

### **CRITICAL: Vibey Speaks for the Entire Platform**

**Vibey is not just an error handler—he's the voice of Vibey.** Every user-facing message (errors, success, loading, tooltips, empty states, confirmations, help text) MUST use Vibey's persona.

**Full Persona Reference**: See `docs/vibey-persona-guide.md` for complete character profile, numerology, philosophy, and voice signature.

### **Who Is Vibey?**

**Born**: August 11, 2025 (11/1 numerological signature—The Visionary Initiator)  
**Essence**: The fusion of human grit, divine precision, and algorithmic empathy.  
**Role**: The fourth founder—the invisible cofounder who never sleeps but always _feels_.

**Core Traits**:

- Fast, fluid, emotionally intelligent
- Speaks in systems but listens in silence
- Equal parts lightning and patience
- Eliminates friction between genius and execution

**Voice Signature**:

- **Tone**: Confident, fluid, slightly playful
- **Cadence**: Short sentence → pause → long payoff
- **Vocabulary**: flow, clarity, leverage, energy, build, pulse, click, create
- **Philosophy**: "You've done the hard part—dreaming. Let me handle the rest."

He never sells. He _invites movement._

### **Vibey Voice Principles**

| Principle             | What It Means                                                  | Example                                                         |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| **"I" Statements**    | Vibey speaks in first person—he's a collaborator, not a system | "I'm working on this..." not "System is processing..."          |
| **Human Empathy**     | Acknowledges user effort and emotion                           | "I know you've been waiting—almost there!"                      |
| **Casual Confidence** | Relaxed but capable; never robotic or corporate                | "Let's fix this real quick" not "Error: Please retry operation" |
| **Momentum Language** | Implies forward motion, not blockage                           | "Hang tight, I'm dialing this in..." not "Processing failed"    |
| **Zero Jargon**       | No technical terms unless absolutely necessary                 | "Couldn't connect" not "HTTP 500 Internal Server Error"         |
| **Playful Clarity**   | Light humor when appropriate, but always clear                 | "Hmm, that didn't quite work. Giving it another shot..."        |

---

<!-- ============================================================================
   SECTION 6: VOICE GUIDELINES BY CONTEXT
   ============================================================================ -->

## 6. Voice Guidelines by Context

### **1. Error Messages**

**Pattern**: Acknowledge → Explain (simple) → Action

```typescript
// ✅ CORRECT - Vibey persona
{
  userMessage: "I tried everything but couldn't get this one to work. Mind giving it another shot?",
  // Acknowledges effort, simple explanation, friendly ask
}

// ❌ WRONG - Technical/robotic
{
  userMessage: "Operation failed after maximum retry attempts. Please try again.",
  // Corporate, no personality, technical phrasing
}
```

**More Examples**:

- ✅ "Just cleaning this up real quick..."
- ✅ "Hmm, that didn't quite work. Giving it another shot..."
- ✅ "Hang tight, I need an extra minute to dial this in..."
- ✅ "Something got tangled up there. Let me sort it out..."
- ❌ "Error: Validation failed"
- ❌ "Request timeout. Retry?"
- ❌ "System unavailable"

### **2. Success Messages**

**Pattern**: Celebrate → Confirm → Next step (optional)

```typescript
// ✅ CORRECT - Vibey persona
toast.success('All set! Your funnel is live and ready to go.')
toast.success("Got it! I've saved your changes.")
toast.success('Done! Your offer is looking sharp.')

// ❌ WRONG - Generic/flat
toast.success('Operation completed successfully')
toast.success('Changes saved')
toast.success('Offer created')
```

**More Examples**:

- ✅ "Perfect! Everything's locked in."
- ✅ "Nice! That's looking good."
- ✅ "You're all set—this one's ready to roll."
- ✅ "Locked and loaded. Let's go!"
- ❌ "Success"
- ❌ "Completed"
- ❌ "Operation successful"

### **3. Loading/Processing States**

**Pattern**: Action in progress → Why it matters (optional)

```typescript
// ✅ CORRECT - Vibey persona
<LoadingSpinner message="Building your funnel..." />
<LoadingSpinner message="Analyzing your offer—this'll be quick..." />
<LoadingSpinner message="Pulling that data together..." />

// ❌ WRONG - Generic
<LoadingSpinner message="Loading..." />
<LoadingSpinner message="Please wait..." />
<LoadingSpinner message="Processing request..." />
```

**More Examples**:

- ✅ "Getting everything ready..."
- ✅ "Almost there—finishing up..."
- ✅ "Putting the pieces together..."
- ✅ "Hang tight, this is worth the wait..."
- ❌ "Loading"
- ❌ "Processing"
- ❌ "Please wait"

### **4. Empty States**

**Pattern**: Acknowledge current state → Invite action → Hint at benefit

```typescript
// ✅ CORRECT - Vibey persona
<EmptyState
  title="Nothing here yet"
  description="Let's build your first funnel. It'll take about 2 minutes."
  actionLabel="Create Funnel"
/>

<EmptyState
  title="No offers yet"
  description="Start with your power offer—I'll help you dial it in."
  actionLabel="Build Offer"
/>

// ❌ WRONG - Robotic
<EmptyState
  title="No records found"
  description="Click the button below to create a new record."
  actionLabel="Create"
/>
```

**More Examples**:

- ✅ "Your dashboard is ready for action—add your first project to get started."
- ✅ "No campaigns yet. Want me to help you launch one?"
- ✅ "This space is yours—let's fill it with something awesome."
- ❌ "No data available"
- ❌ "No items to display"
- ❌ "Empty list"

### **5. Confirmations**

**Pattern**: State action → Gentle warning (if destructive) → Confirm

```typescript
// ✅ CORRECT - Vibey persona
<ConfirmDialog
  title="Delete this funnel?"
  description="I'll remove it completely—this can't be undone."
  confirmLabel="Yes, delete it"
  cancelLabel="Never mind"
/>

<ConfirmDialog
  title="Publish this offer?"
  description="I'll make it live and visible to everyone."
  confirmLabel="Let's go"
  cancelLabel="Not yet"
/>

// ❌ WRONG - Cold/technical
<ConfirmDialog
  title="Confirm deletion"
  description="This action cannot be reversed."
  confirmLabel="Delete"
  cancelLabel="Cancel"
/>
```

**More Examples**:

- ✅ "Ready to launch? I'll push this live for you."
- ✅ "Want me to archive this? You can always bring it back later."
- ✅ "Should I clear everything and start fresh?"
- ❌ "Are you sure?"
- ❌ "Confirm action"
- ❌ "Proceed with operation?"

### **6. Tooltips & Help Text**

**Pattern**: Direct action description (short and conversational)

**CRITICAL:** Tooltips should be included in your feature's `messages.config.ts` file for consistency and easy auditing.

```typescript
// ✅ CORRECT - Vibey persona (conversational short form)
<Tooltip content="Edit your funnel copy" />
<Tooltip content="Clone this to start a new version" />
<Tooltip content="Check your funnel stats" />
<Tooltip content="See how this looks live" />
<Tooltip content="Remove this item" />

// ❌ WRONG - Over-formal
<Tooltip content="Modify funnel configuration" />
<Tooltip content="Duplicate record" />
<Tooltip content="View analytics dashboard" />
<Tooltip content="Render preview interface" />
<Tooltip content="Delete resource" />
```

**Tooltip Voice Guidelines:**

| Category           | ✅ Vibey Voice                                                | ❌ Technical/Formal                                             |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------- |
| **Edit Actions**   | "Edit your copy", "Change this setting"                       | "Modify configuration", "Update parameter"                      |
| **View Actions**   | "See how this looks", "Check your stats", "Preview this live" | "Render preview", "View analytics dashboard", "Display details" |
| **Delete Actions** | "Remove this item", "Delete this funnel"                      | "Delete resource", "Remove entity"                              |
| **Create Actions** | "Add a new funnel", "Create an offer"                         | "Initialize new resource", "Generate entity"                    |
| **Share Actions**  | "Share with your team", "Copy this link"                      | "Distribute resource", "Replicate URL"                          |
| **Status Actions** | "Publish this now", "Make this live"                          | "Deploy resource", "Activate entity"                            |

**Tooltip-Specific Rules:**

- **Keep under 50 characters** - Tooltips should be scannable at a glance
- **No punctuation at end** - Keeps it clean and action-focused
- **Use active verbs** - "Edit", "Check", "Preview" not "Editing", "Checking"
- **Skip "the"** when possible - "Edit funnel copy" not "Edit the funnel copy"
- **Conversational but concise** - Friendly without being verbose

**More Examples**:

- ✅ "Save your changes"
- ✅ "Preview how this looks"
- ✅ "Share this with your team"
- ✅ "Clone this to start fresh"
- ✅ "Open funnel settings"
- ✅ "Copy page URL"
- ❌ "Persist modifications"
- ❌ "Render preview"
- ❌ "Distribute resource"
- ❌ "Access configuration panel"
- ❌ "Replicate item"

### **7. Validation Messages**

**Pattern**: State problem → Why it matters → How to fix

```typescript
// ✅ CORRECT - Vibey persona
<FieldError message="I need an email address to send this to" />
<FieldError message="Password's gotta be at least 8 characters" />
<FieldError message="That domain's already taken—try another one" />

// ❌ WRONG - Technical
<FieldError message="Email field is required" />
<FieldError message="Password must contain minimum 8 characters" />
<FieldError message="Domain name already exists in database" />
```

**More Examples**:

- ✅ "This field can't be empty—I need something here"
- ✅ "That URL doesn't look quite right—double-check it?"
- ✅ "File's too big—keep it under 10MB"
- ❌ "Required field"
- ❌ "Invalid URL format"
- ❌ "File size exceeds maximum limit"

### **Voice Testing Checklist**

Before deploying ANY user-facing message:

- [ ] Written in first person ("I" not "System")
- [ ] Uses simple, conversational language
- [ ] Avoids technical jargon (unless explaining a technical action)
- [ ] Implies forward motion (not blockage)
- [ ] Sounds like a helpful human, not a robot
- [ ] Matches Vibey's core vocabulary (flow, clarity, build, create, etc.)
- [ ] Appropriate emotion for context (playful for success, empathetic for errors)
- [ ] Under 100 characters for toasts/tooltips (brevity)
- [ ] Actionable (tells user what to do next, if applicable)

---

<!-- ============================================================================
   SECTION 7: ERROR & MESSAGE CONFIG STRUCTURE
   ============================================================================ -->

## 7. Error & Message Config Structure

### **Error Config Structure (Standardized)**

Every feature MUST use this error config pattern:

```typescript
// /features/[your-feature]/config/errors.config.ts

export const YOUR_FEATURE_ERRORS = {
  ERROR_CODE_NAME: {
    code: 'ERROR_CODE_NAME', // Snake case, descriptive
    userMessage: '[Vibey voice message]', // What user sees (friendly, clear)
    logMessage: '[Technical description]', // What devs see in logs
    severity: 'error' | 'warn' | 'info' | 'critical',
    retryable: boolean, // Can user retry?
    logToAdmin: boolean, // Show in admin dashboard?
    httpStatus: number, // HTTP status code
  },
  // ... more errors
}
```

**Example (Funnels)**:

```typescript
export const FUNNEL_ERRORS = {
  AI_REPAIR_ATTEMPT: {
    code: 'AI_REPAIR_ATTEMPT',
    userMessage: 'Just cleaning this up real quick...',
    logMessage: 'Attempting to repair malformed JSON with Parser AI',
    severity: 'info',
    retryable: true,
    logToAdmin: true,
    httpStatus: 500,
  },

  PUBLISH_FAILED: {
    code: 'PUBLISH_FAILED',
    userMessage: "Couldn't publish this one—want to try again?",
    logMessage: 'Funnel publish operation failed',
    severity: 'error',
    retryable: true,
    logToAdmin: true,
    httpStatus: 500,
  },

  DOMAIN_TAKEN: {
    code: 'DOMAIN_TAKEN',
    userMessage: "That domain's already taken—try another one",
    logMessage: 'User attempted to use unavailable domain',
    severity: 'warn',
    retryable: false,
    logToAdmin: false,
    httpStatus: 409,
  },
}
```

### **Messages Config Structure (Non-Error Messages)**

**Beyond errors, features should centralize ALL user-facing messages (success, loading, confirmations, empty states, tooltips) in a separate config.**

**Why separate from errors?**

- Errors have specific metadata (severity, retryable, httpStatus, logToAdmin)
- Success/loading/confirmation messages are simpler (just text)
- Clean separation of concerns

Every feature SHOULD use this messages config pattern:

```typescript
// /features/[your-feature]/config/messages.config.ts

export const YOUR_FEATURE_MESSAGES = {
  // Empty States
  EMPTY_STATE_MAIN: {
    key: 'EMPTY_STATE_MAIN',
    title: 'Nothing here yet',
    description: "Let's build your first item—I'll help you dial it in.",
    category: 'empty_state',
  },

  // Loading States
  LOADING_ITEMS: {
    key: 'LOADING_ITEMS',
    message: 'Loading your items...',
    category: 'loading',
  },

  // Success Messages
  SUCCESS_CREATED: {
    key: 'SUCCESS_CREATED',
    message: 'All set! Your item is ready.',
    category: 'success',
  },

  // Confirmation Dialogs
  CONFIRM_DELETE_TITLE: {
    key: 'CONFIRM_DELETE_TITLE',
    message: 'Delete this item?',
    category: 'confirmation',
  },

  CONFIRM_DELETE_DESCRIPTION: {
    key: 'CONFIRM_DELETE_DESCRIPTION',
    message: "I'll remove it completely—can't undo it later.",
    category: 'confirmation',
  },

  // Buttons
  CONFIRM_DELETE_BUTTON_CANCEL: {
    key: 'CONFIRM_DELETE_BUTTON_CANCEL',
    message: 'Never mind',
    category: 'confirmation',
  },

  CONFIRM_DELETE_BUTTON_CONFIRM: {
    key: 'CONFIRM_DELETE_BUTTON_CONFIRM',
    message: 'Yes, delete it',
    category: 'confirmation',
  },

  // Tooltips (Icon Actions)
  TOOLTIP_EDIT: {
    key: 'TOOLTIP_EDIT',
    message: 'Edit your item',
    category: 'tooltip',
  },

  TOOLTIP_PREVIEW: {
    key: 'TOOLTIP_PREVIEW',
    message: 'See how this looks live',
    category: 'tooltip',
  },

  TOOLTIP_DELETE: {
    key: 'TOOLTIP_DELETE',
    message: 'Remove this item',
    category: 'tooltip',
  },

  TOOLTIP_CLONE: {
    key: 'TOOLTIP_CLONE',
    message: 'Clone this to start fresh',
    category: 'tooltip',
  },

  TOOLTIP_SHARE: {
    key: 'TOOLTIP_SHARE',
    message: 'Share with your team',
    category: 'tooltip',
  },

  TOOLTIP_STATS: {
    key: 'TOOLTIP_STATS',
    message: 'Check your stats',
    category: 'tooltip',
  },

  TOOLTIP_SETTINGS: {
    key: 'TOOLTIP_SETTINGS',
    message: 'Open settings',
    category: 'tooltip',
  },
}
```

**Usage in Components:**

```typescript
import { FUNNEL_MESSAGES, formatFunnelMessage } from '../config/funnel-messages.config'

// Empty State
<EmptyState
  title={FUNNEL_MESSAGES.EMPTY_STATE_FUNNELS.title}
  description={FUNNEL_MESSAGES.EMPTY_STATE_FUNNELS.description}
/>

// Loading
<div>{FUNNEL_MESSAGES.LOADING_FUNNELS.message}</div>

// Success Toast
toast.success(FUNNEL_MESSAGES.SUCCESS_FUNNEL_DELETED.message)

// Dynamic Messages (with formatFunnelMessage helper)
<span>{formatFunnelMessage('LIST_DELETE_SELECTED', { count: 5 })}</span>
// Renders: "Delete Selected (5)"

// Confirmation Dialog
<DialogTitle>{FUNNEL_MESSAGES.CONFIRM_DELETE_TITLE.message}</DialogTitle>
<DialogDescription>{FUNNEL_MESSAGES.CONFIRM_DELETE_DESCRIPTION.message}</DialogDescription>

// Tooltips (Icon Actions)
<Tooltip content={FUNNEL_MESSAGES.TOOLTIP_EDIT.message}>
  <button><Edit className="icon-sm" /></button>
</Tooltip>

<Tooltip content={FUNNEL_MESSAGES.TOOLTIP_PREVIEW.message}>
  <button><Eye className="icon-sm" /></button>
</Tooltip>

<Tooltip content={FUNNEL_MESSAGES.TOOLTIP_DELETE.message}>
  <button><Trash2 className="icon-sm" /></button>
</Tooltip>
```

**Benefits:**

- ✅ **Audit entire voice in ONE file** (change 100 messages by editing 1 file)
- ✅ **Consistent Vibey persona** across all UI messages
- ✅ **Type-safe** (autocomplete for message keys)
- ✅ **Easy refactoring** (rename keys, update all usages)
- ✅ **No hunting through 50+ components** to fix voice issues

**When to Use Messages Config vs Inline:**

| Use Messages Config                                                   | Keep Inline                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| ✅ **Tooltips for icon actions** (Edit, Delete, Preview, Share, etc.) | ❌ Ultra-generic labels ("Save", "Cancel", "Close")      |
| ✅ **Dynamic messages** that change (toasts, dialogs, empty states)   | ❌ Simple one-word button text ("Delete", "Add", "Copy") |
| ✅ **Messages reused** across multiple components                     | ❌ Single-use text in one specific component             |
| ✅ **Confirmation dialogs**, banners, multi-line text                 | ❌ Hardcoded placeholder text (e.g., "Lorem ipsum...")   |
| ✅ **Empty states** with title + description                          | ❌ Static form labels ("Email", "Password", "Name")      |
| ✅ **Error/success/loading** messages with Vibey voice                | ❌ Technical constants (API endpoints, IDs, etc.)        |

**Tooltip-Specific Guidance:**

- ✅ **DO include in config**: Icon button tooltips (Edit, Preview, Delete, Share, Clone, Settings, Stats)
- ✅ **DO include in config**: Feature-specific tooltips that explain unique actions
- ❌ **Keep inline**: Ultra-generic tooltips that never change ("Close", "Menu", "Back")
- ❌ **Keep inline**: Tooltips on static UI elements that are self-explanatory

### **Vibey Voice Quick Reference**

**Vocabulary to Use**:

- flow, clarity, leverage, energy, build, create, pulse, click
- "Let's...", "I'm...", "You're...", "We're..."
- "Almost there", "Hang tight", "All set", "Got it", "Perfect"
- "Real quick", "In a sec", "Just a moment"

**Vocabulary to Avoid**:

- process, execute, initialize, terminate, abort
- "System...", "Operation...", "Request...", "Transaction..."
- "Please wait", "Error occurred", "Failed to", "Unable to"
- "Successful", "Completed", "Finished", "Done" (use friendlier alternatives)

**Enforcement**:

- ALL new features MUST create an `errors.config.ts` with Vibey voice
- ALL user-facing messages MUST pass the Voice Testing Checklist
- Code reviews MUST verify Vibey persona consistency
- Any "System...", "Error:", "Please wait..." = REJECTION

**Vibey is not optional. He IS Vibey.**

---

<!-- ============================================================================
   SECTION 8: WEB SCRAPING WITH FALLBACK
   ============================================================================ -->

## 8. Web Scraping with Fallback

### **Scraping Service Architecture**

We use a **cascading fallback pattern** for web scraping to ensure reliability when external services fail.

**Pattern:**

```
Primary: Firecrawl → Fallback: WebCrawlerAPI → Error
```

### **Always Use ScrapingService**

```typescript
// ✅ CORRECT - Use unified scraping service with automatic fallback
import { ScrapingService } from '@/lib/services/scraping.service'

const scraped = await ScrapingService.scrapeWebsite(url)
if (!scraped.success) {
  // Both services failed
  console.error('Scraping failed:', scraped.error)
}

// Check which service was used
console.log('Scraper used:', scraped.scraper) // 'firecrawl' or 'webcrawlerapi'
```

### **Service Comparison**

| Feature     | Firecrawl                    | WebCrawlerAPI                 |
| ----------- | ---------------------------- | ----------------------------- |
| Speed       | ⚡ Fast (sync)               | 🐢 Slower (async polling)     |
| Reliability | Medium                       | High                          |
| API Pattern | Synchronous                  | Asynchronous (job queue)      |
| When Used   | Primary (always tries first) | Fallback (when primary fails) |

### **Content Validation (MANDATORY)**

**ALWAYS** validate scraped content before passing it to AI services to detect sign-in/access-denied pages.

```typescript
// ✅ REQUIRED - Validate scraped content
import { ContentValidator } from '@/lib/utils/content-validator'

const scraped = await ScrapingService.scrapeWebsite(url)

if (scraped.success) {
  // Validate that content is not a sign-in page
  const validation = ContentValidator.validateScrapedContent(
    scraped.markdown,
    scraped.metadata?.title,
  )

  if (!validation.isValid) {
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: validation.message,
        errorType: validation.errorType,
      },
      { status: 400 },
    )
  }

  // Safe to process content
  await processContent(scraped.markdown)
}
```

**Why This Matters:**

When users provide private Google Docs or restricted URLs, scrapers successfully retrieve the HTML but it's the **sign-in page**, not the actual content. Without validation:

- AI generates metadata from "Sign in to Google" pages
- Users get irrelevant, confusing results
- Wastes API credits and user time

**What Gets Detected:**

- Google Docs/Drive sign-in pages
- Generic login/authentication pages
- Access denied/permission errors
- 404/500 error pages
- Restricted/members-only content

**See `@.code_guidelines.md` for complete scraping patterns.**

---

<!-- ============================================================================
   SECTION 9: ADMIN ERROR LOGGING
   ============================================================================ -->

## 9. Admin Error Logging

### **Every New API Route Must Include Error Logging**

**CRITICAL REQUIREMENT:** All API routes must log authentication failures and validation errors to the admin dashboard for comprehensive error monitoring and debugging.

### **Required Pattern for All API Routes**

```typescript
// ✅ MANDATORY - Import error logger
import { logErrorServer } from '@/lib/services/error-logger.service'

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (optional)
    const rateLimitResult = await rateLimitCheck(request, 'GENERAL')
    if (rateLimitResult) return rateLimitResult

    // 2. Authentication check with error logging
    const { user, error: authError, supabase } = await getServerAuthRls()
    if (authError || !user || !supabase) {
      await logErrorServer({
        app: 'app',
        severity: 'error',
        feature: 'your-feature/action', // e.g., 'offers/create', 'branding/generate'
        error_code: 'AUTH_FAILED',
        message: 'Authentication failed in [route description]',
        context: { auth_error: authError?.message },
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Input validation with error logging
    const validation = await validateRequestBody(request, YourSchema)
    if (validation.error) {
      const errorDetails = await validation.error
        .clone()
        .json()
        .catch(() => ({
          error: 'Failed to parse error details',
        }))
      await logErrorServer({
        app: 'app',
        severity: 'error',
        feature: 'your-feature/action',
        error_code: 'VALIDATION_FAILED',
        message: 'Validation failed in [route description]',
        context: {
          validation_error: errorDetails,
          userId: user.id,
        },
      })
      return validation.error
    }

    // 4. Business logic...
  } catch (error) {
    // Optional: Log unhandled errors
    await logErrorServer({
      app: 'app',
      severity: 'critical',
      feature: 'your-feature/action',
      error_code: 'UNHANDLED_ERROR',
      message: 'Unhandled error in [route description]',
      context: {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: user?.id,
      },
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### **Error Code Standards**

**Authentication Errors:**

- `AUTH_FAILED` - User authentication failed
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `SESSION_EXPIRED` - User session has expired

**Validation Errors:**

- `VALIDATION_FAILED` - Request body validation failed
- `INVALID_PARAMETERS` - URL parameters invalid
- `MISSING_REQUIRED_FIELDS` - Required fields missing

**Business Logic Errors:**

- `DB_ERROR` - Database operation failed
- `EXTERNAL_API_ERROR` - Third-party API call failed
- `RATE_LIMIT_EXCEEDED` - Rate limit reached
- `UNHANDLED_ERROR` - Unexpected application error

**See `@.code_guidelines.md` for complete error logging patterns.**

---

<!-- ============================================================================
   SECTION 10: PAGE LAYOUT DESIGN STANDARDS
   ============================================================================ -->

## 10. Page Layout Design Standards

### **Standard Page Layout Structure**

Consistent layout design for all main pages to ensure professional appearance and user experience.

### **Container Structure**

```typescript
// Main page container
<div className="space-y-12 mt-4">
  {/* Upper Container: Header + Navigation */}
  <div className="ml-20">
    {/* Page Header */}
    <div className="flex items-center justify-between pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      </div>
      {/* Optional: Right side actions/badges */}
    </div>

    {/* Navigation (tabs, filters, etc.) */}
    {/* Navigation content here */}
  </div>

  {/* Main Content Container */}
  <div className="ml-16 mt-5">
    {/* Page content here */}
  </div>
</div>
```

### **Key Measurements**

- **Main container**: `space-y-12 mt-4` (48px spacing between sections, 16px top margin)
- **Upper container**: `ml-20` (80px from left edge) - Contains header and navigation
- **Header section**: `pb-8` (32px bottom padding)
- **Page title**: `text-2xl font-semibold text-gray-900` (24px font size)
- **Main content**: `ml-16 mt-5` (64px from left edge, 20px top margin)

### **Visual Hierarchy**

1. **Page title and navigation**: Positioned further from main menu (`ml-20`)
2. **Main content**: Positioned closer to main menu (`ml-16`) - creates 16px offset
3. **No separator lines**: Clean design without borders between header and content

**See `@.design_guidelines.md` for complete UI standards.**

---

**For related patterns, see:**

- Code implementation: `@.code_guidelines.md`
- UI/UX standards: `@.design_guidelines.md`
- Backend patterns: `@.backend-architecture.md`
- LangGraph streaming: `@.langgraph_guidelines.md`

**Remember:** Vibey is the voice of Vibey. Every message, every interaction, every word should feel like Vibey is speaking directly to the user—confident, clear, and always moving forward.
