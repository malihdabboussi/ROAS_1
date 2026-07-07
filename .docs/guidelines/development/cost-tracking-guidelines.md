# Cost Tracking Guidelines

## Overview

This document explains how to implement cost tracking for any AI feature in Vibey. Use this guide when adding a new AI service (text, image, audio, etc.) that needs usage and cost tracking.

---

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│ token_providers_pricing    → Pricing data (cost per unit)   │
│ token_ai_usage_events      → Individual usage events        │
│ token_usage_rollups_monthly → Monthly aggregates            │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│ UsageTrackerService        → Tracks, calculates, stores     │
│   - trackUsage()           → Main entry point               │
│   - calculateAndSetCost()  → Looks up pricing, computes     │
│   - storeUsageEvent()      → Writes to database             │
│   - updateMonthlyRollups() → Updates aggregates             │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│ Your service calls trackUsage() after successful AI call    │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step: Adding Cost Tracking for a New Service

### Step 1: Add Pricing Data to Database

Create a migration file in `supabase/migrations/`:

```sql
-- Example: supabase/migrations/YYYYMMDDHHMMSS_add_YOUR_SERVICE_pricing.sql

BEGIN;

INSERT INTO public.token_providers_pricing
  (provider, service_type, model_name, cost_per_unit, unit_type)
VALUES
  -- Use appropriate unit_type for your service
  ('your-provider', 'your-service-type', 'model-name-1', 0.01, 'images_1'),
  ('your-provider', 'your-service-type', 'model-name-2', 0.02, 'images_1')
ON CONFLICT (provider, service_type, model_name, unit_type) DO UPDATE SET
  cost_per_unit = EXCLUDED.cost_per_unit,
  updated_at = now();

COMMIT;
```

**Apply to both environments using MCP:**

```typescript
// Dev branch
mcp_supabase_apply_migration({
  project_id: 'eludnfzqffnqnohfkzbk',
  name: 'add_your_service_pricing',
  query: '...', // Your SQL migration
})

// Prod
mcp_supabase_apply_migration({
  project_id: 'tfghpeibkeuymtqpbrjm',
  name: 'add_your_service_pricing',
  query: '...', // Your SQL migration
})
```

### Step 2: Define Provider Types

In `apps/app-backend/src/lib/services/usage-tracker.service.ts`:

**Add new provider type:**

```typescript
type Provider =
  | 'openrouter'
  | 'openrouter-images'
  | 'replicate-images'
  | 'deepgram'
  | 'YOUR_PROVIDER'
```

**Add Zod schema for validation:**

```typescript
const YourProviderUsageSchema = z.object({
  model: z.string(),
  // Add fields specific to your provider:
  imageCount: z.number().int().positive().default(1), // for images
  // OR: inputTokens + outputTokens (for LLMs)
  // OR: durationSeconds (for audio)
  metadata: z.record(z.string(), z.any()).optional(),
})
```

### Step 3: Update UsageTrackerService

**1. Add validation case:**

```typescript
private validateUsageData(provider: Provider, data: UsageData): UsageData {
  switch (provider) {
    // ...existing cases...
    case 'your-provider':
      return YourProviderUsageSchema.parse(data);
  }
}
```

**2. Add field extraction in createUsageEvent:**

```typescript
private createUsageEvent(...): UsageEvent {
  // ...existing code...

  // Add for your provider
  if (provider === 'your-provider' && 'yourField' in data) {
    baseEvent.yourField = data.yourField;
  }
}
```

**3. Add service type mapping:**

```typescript
private getServiceType(provider: Provider, data: UsageData): string {
  switch (provider) {
    // ...existing cases...
    case 'your-provider':
      return 'your-service-type'; // Must match pricing table
  }
}
```

**4. Add cost calculation logic:**

```typescript
private async calculateAndSetCost(event: UsageEvent, supabase: SupabaseClient): Promise<void> {
  // ...existing code...

  // Add for your provider
  if (event.provider === 'your-provider') {
    const { data: pricing, error } = await supabase
      .from('token_providers_pricing')
      .select('cost_per_unit, unit_type')
      .eq('provider', event.provider)
      .eq('service_type', event.serviceType)
      .eq('model_name', lookupModel)
      .eq('unit_type', 'your_unit_type') // e.g., 'images_1'
      .single();

    if (error || !pricing) {
      this.logger.warn(`No pricing found for ${lookupModel}`);
      return;
    }

    // Calculate cost based on your unit type
    event.computedCost = (event.yourQuantity || 1) * pricing.cost_per_unit;
    return;
  }
}
```

### Step 4: Call trackUsage from Your Feature

**Example: OpenRouter LLM (text generation)**

```typescript
// From: apps/app-backend/src/modules/offers/integrations/openrouter.integration.ts

// After successful AI call, track usage
if (userId && response.usage) {
  const cachedTokens = response.usage.prompt_tokens_details?.cached_tokens || 0

  this.usageTracker
    .trackUsage(
      'offers', // Feature name
      'openrouter', // Provider name
      {
        model: response.model || modelToUse,
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0,
        cachedTokens,
        generationId: response.id || null,
        actualCost: response.usage.cost || null,
        metadata: {
          feature: 'offer-generation',
          step: stepNumber,
          stepName,
        },
      },
      userId,
      supabase,
    )
    .catch((err) => {
      // Don't fail the request if tracking fails
      this.logger.warn(`Usage tracking failed: ${err}`)
    })
}
```

**Example: Replicate Images**

```typescript
// From: apps/app-backend/src/modules/media/services/image-generation.service.ts

// After successful image generation, track usage
await this.usageTracker.trackUsage(
  'media', // Feature name
  'replicate-images', // Provider name
  {
    model,
    imageCount: 1,
    metadata: {
      type: 'image_generation',
      provider: 'replicate',
    },
  },
  userId,
  supabase,
)
```

---

## Unit Types Reference

| Unit Type          | Use For          | Calculation                              |
| ------------------ | ---------------- | ---------------------------------------- |
| `images_1`         | Image generation | `imageCount × cost_per_unit`             |
| `input_tokens_1k`  | LLM input        | `(inputTokens / 1000) × cost_per_unit`   |
| `output_tokens_1k` | LLM output       | `(outputTokens / 1000) × cost_per_unit`  |
| `minutes`          | Audio/Speech     | `(durationSeconds / 60) × cost_per_unit` |
| `characters_1k`    | TTS              | `(characters / 1000) × cost_per_unit`    |

---

## Current Providers

### OpenRouter (LLM)

- **Provider:** `openrouter`
- **Service Type:** `llm`
- **Unit Types:** `input_tokens_1k`, `output_tokens_1k`
- **Features:** offers, funnels, chat, campaigns
- **Special fields:**
  - `inputTokens` - from `response.usage.prompt_tokens`
  - `outputTokens` - from `response.usage.completion_tokens`
  - `cachedTokens` - from `response.usage.prompt_tokens_details?.cached_tokens`
  - `generationId` - from `response.id`
  - `actualCost` - from `response.usage.cost`

### Replicate Images

- **Provider:** `replicate-images`
- **Service Type:** `image-generation`
- **Unit Type:** `images_1`
- **Features:** media (lead magnets)
- **Special fields:**
  - `imageCount` - number of images generated (default: 1)

**Current Models:**
| Model | Cost/Image |
|-------|------------|
| gpt-image-1.5 | $0.14 |
| nano-banana-pro | $0.15 |
| flux-2-max | $0.04 |
| flux-2-pro | $0.015 |
| seedream-4.5 | $0.04 |
| nano-banana | $0.039 |
| seedream-4 | $0.03 |

### Deepgram (Speech)

- **Provider:** `deepgram`
- **Service Types:** `speech-to-text`, `speech-to-text-streaming`
- **Unit Type:** `minutes`
- **Features:** transcribe
- **Special fields:**
  - `durationSeconds` - audio duration in seconds
  - `charactersProcessed` - (optional) for TTS

---

## Database Schema

### token_providers_pricing

```sql
CREATE TABLE public.token_providers_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,           -- 'openrouter', 'replicate-images', 'deepgram'
  service_type text NOT NULL,       -- 'llm', 'image-generation', 'speech-to-text'
  model_name text NOT NULL,         -- e.g., 'gpt-image-1.5', 'nova-3'
  cost_per_unit decimal(10,6) NOT NULL,
  unit_type text NOT NULL,          -- 'images_1', 'input_tokens_1k', 'minutes'
  currency text DEFAULT 'USD',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, service_type, model_name, unit_type)
);
```

### token_ai_usage_events

```sql
CREATE TABLE public.token_ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,            -- 'offers', 'media', 'chat', etc.
  provider text NOT NULL,           -- 'openrouter', 'replicate-images'
  service_type text NOT NULL,
  model_name text NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Usage metrics (use relevant ones)
  input_tokens integer NULL,
  output_tokens integer NULL,
  cached_tokens integer NULL,       -- Cached tokens (OpenRouter prompt caching)
  duration_seconds decimal(10,3) NULL,
  characters_processed integer NULL,

  -- Cost
  computed_cost decimal(10,6) NULL, -- Calculated from pricing table
  actual_cost decimal(10,6) NULL,   -- Actual cost from OpenRouter response
  currency text DEFAULT 'USD',

  -- Tracking
  generation_id text NULL,          -- OpenRouter generation ID
  cache_discount_actual decimal(10,6) NULL,
  cost_fetched_at timestamptz NULL,

  metadata_json jsonb NULL
);
```

---

## Checklist: New AI Cost Tracking

- [ ] **Pricing data**: Created migration with model pricing
- [ ] **Migration applied**: Both dev and prod databases updated via MCP
- [ ] **Provider type**: Added to `Provider` type union
- [ ] **Zod schema**: Created validation schema for usage data
- [ ] **Validation**: Added case in `validateUsageData()`
- [ ] **Event creation**: Added field extraction in `createUsageEvent()`
- [ ] **Service type**: Added mapping in `getServiceType()`
- [ ] **Cost calculation**: Added logic in `calculateAndSetCost()`
- [ ] **Feature call**: Service calls `trackUsage()` after AI success
- [ ] **Verified**: Checked events in database after test generation

---

## Verification

**Check pricing exists:**

```sql
SELECT * FROM token_providers_pricing
WHERE provider = 'your-provider'
ORDER BY model_name;
```

**Check events are being recorded:**

```sql
SELECT * FROM token_ai_usage_events
WHERE provider = 'your-provider'
ORDER BY created_at DESC
LIMIT 10;
```

**Check computed_cost is populated:**

```sql
SELECT model_name, computed_cost, created_at
FROM token_ai_usage_events
WHERE provider = 'your-provider'
  AND computed_cost IS NOT NULL
ORDER BY created_at DESC;
```

---

## Files Reference

| File                                                         | Purpose                         |
| ------------------------------------------------------------ | ------------------------------- |
| `apps/app-backend/src/lib/services/usage-tracker.service.ts` | Main tracker (NestJS)           |
| `apps/app/src/lib/services/usage-tracker.service.ts`         | Frontend tracker (keep in sync) |
| `supabase/migrations/YYYYMMDD*_pricing.sql`                  | Pricing data migrations         |
| `token_providers_pricing`                                    | Pricing table                   |
| `token_ai_usage_events`                                      | Usage events table              |
| `token_usage_rollups_monthly`                                | Monthly aggregates              |

---

## Common Issues

### Cost is NULL in events

- **Cause**: Model name doesn't match pricing table
- **Fix**: Verify model name in code matches `model_name` in pricing table exactly

### No events recorded

- **Cause**: `trackUsage()` not being called or failing silently
- **Fix**: Add logging to catch block, verify userId and supabase are valid

### Wrong cost calculation

- **Cause**: Unit type mismatch
- **Fix**: Ensure `unit_type` in pricing table matches calculation logic

---

## Supabase Project References

| Environment | Project ID             |
| ----------- | ---------------------- |
| Dev branch  | `eludnfzqffnqnohfkzbk` |
| Production  | `tfghpeibkeuymtqpbrjm` |

Use these IDs when applying migrations via MCP.
