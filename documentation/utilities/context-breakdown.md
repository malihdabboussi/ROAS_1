# Context Breakdown Utility

Last Modified: 2026-05-25

## When To Use

Use `@vibey/context-breakdown` when code needs the shared context breakdown contract or token counting helpers for chat context reporting.

Use app-local helpers when the logic depends on app-specific message shapes, such as Studio `Message` and `ContentBlock` structures.

## API

```ts
import {
  charsToTokensFast,
  countJsonTokens,
  countTextTokens,
  type ContextBreakdown,
} from '@vibey/context-breakdown'
```

- `countTextTokens(text)` counts text using `cl100k_base` from `js-tiktoken`.
- `charsToTokensFast(chars)` uses the fallback `Math.ceil(chars / 4)` estimate.
- `countJsonTokens(value)` serializes JSON safely and counts the result.
- `ContextBreakdown` is the shared server/client payload for the panel.

## Used By

- `apps/agent-api/src/modules/chat/services/chat.service.ts`
- `apps/web/src/features/studio/services/chat.service.ts`
- `apps/web/src/features/studio/store/use-chat-store.ts`
- `apps/web/src/features/studio/components/ChatInput/ContextBreakdownPopover.tsx`
- `apps/web/src/features/studio/hooks/useLiveContextEstimate.ts`
- `apps/web/src/features/studio/utils/context-token-counter.ts`

## Change History

2026-05-25: Added the package for the context breakdown panel feature.
