All 12 email-related tables already exist in the database. Now I have complete context. Let me write the analysis.

---

# Meticulous Analysis: Porting SendGrid Email Feature from Legacy to Vibey 2.0

## 1. Problem Restatement

The legacy Vibey app (`Vibey_legacy/apps/app-backend`) has a **complete SendGrid email module** (`src/modules/email/`) with full capabilities: sending single/bulk emails, domain authentication, sender identity management, webhook processing, unsubscribe/preference center, inbound email parsing (reply tracking), and reply detection for sequence control.

The new Vibey 2.0 app (`apps/api/`) is a NestJS backend with **only 2 modules**: `ChatModule` and `ConversationsModule`. It has **zero email capability**.

## 2. Environment & Context

**Legacy backend:** NestJS (v11), `@sendgrid/mail@^8.1.6`, `@sendgrid/client@^8.1.6`, `@sendgrid/eventwebhook@^8.0.0`

**New backend:** NestJS (v11), no SendGrid packages installed

**Database:** All 12 email-related tables **already exist** in the develop branch (`hqqrqrdwtxfrzcuxqfvv`):

- `email_domains`, `email_sends`, `email_events`, `email_sender_identities`
- `email_suppressions`, `email_settings`, `email_single_schedules`
- `email_broadcast_schedules`, `broadcast_email_sends`, `broadcast_drafts`
- `crm_contact_messages`, `sequence_email_sends`

**Env vars needed** (from legacy config):

- `SENDGRID_API_KEY`
- `SENDGRID_WEBHOOK_VERIFICATION_KEY`
- `UNSUBSCRIBE_TOKEN_SECRET` (or falls back to `SENDGRID_WEBHOOK_VERIFICATION_KEY`)
- `BACKEND_URL` (for webhook URLs)

## 3. Evidence Pack: What Needs to Be Ported

### Layer 3 - Integration (1 file)

| File                                   | Lines | Purpose                                                                                                                                                      |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `integrations/sendgrid.integration.ts` | 851   | Direct SendGrid API calls: send email, domain auth CRUD, sender identity CRUD, unsubscribe groups/suppressions, webhook verification, inbound parse settings |

### Layer 2 - Services (7 files)

| File                                    | Lines | Purpose                                                                                   |
| --------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `services/email-send.service.ts`        | 1145  | Single/bulk email sending, CAN-SPAM footer, preview text, branding, email logs, archiving |
| `services/domain-auth.service.ts`       | 573   | Domain add/verify/delete, DNS record management, reply tracking (inbound parse)           |
| `services/webhook-processor.service.ts` | 461   | Process SendGrid webhook events, update statuses, manage suppressions                     |
| `services/sender-identity.service.ts`   | 446   | Create/update/delete sender identities, sync from SendGrid                                |
| `services/unsubscribe.service.ts`       | 333   | Token-based unsubscribe, preference center, global unsubscribe                            |
| `services/inbound-email.service.ts`     | 759   | Inbound email processing, correlation matching, content cleaning                          |
| `services/reply-detection.service.ts`   | 293   | Auto-pause sequences on reply/keyword detection                                           |

### Layer 2.5 - Utils (1 file)

| File                              | Lines | Purpose                                                       |
| --------------------------------- | ----- | ------------------------------------------------------------- |
| `utils/unsubscribe-token.util.ts` | 120   | HMAC-signed token generation/validation for unsubscribe links |

### Layer 3 - Repositories (8 files)

| File                                                 | Lines | Purpose                            |
| ---------------------------------------------------- | ----- | ---------------------------------- |
| `repositories/email-domains.repository.ts`           | ?     | CRUD for `email_domains`           |
| `repositories/email-sends.repository.ts`             | ?     | CRUD for `email_sends`             |
| `repositories/email-events.repository.ts`            | ?     | CRUD for `email_events`            |
| `repositories/email-sender-identities.repository.ts` | ?     | CRUD for `email_sender_identities` |
| `repositories/email-suppressions.repository.ts`      | ?     | CRUD for `email_suppressions`      |
| `repositories/crm-contact-messages.repository.ts`    | ?     | CRUD for `crm_contact_messages`    |
| `repositories/sequence-send-batches.repository.ts`   | ?     | CRUD for sequence batch tracking   |
| `repositories/broadcast-drafts.repository.ts`        | ?     | CRUD for `broadcast_drafts`        |

### Layer 1 - Controllers (9 files)

| File                                               | Purpose                           |
| -------------------------------------------------- | --------------------------------- |
| `controllers/domains.controller.ts`                | Domain CRUD endpoints             |
| `controllers/send.controller.ts`                   | Send email endpoints              |
| `controllers/webhooks.controller.ts`               | SendGrid webhook receiver         |
| `controllers/sender-identities.controller.ts`      | Sender identity CRUD              |
| `controllers/suppressions.controller.ts`           | Suppression management            |
| `controllers/unsubscribe.controller.ts`            | Public unsubscribe page           |
| `controllers/broadcast-drafts.controller.ts`       | Broadcast draft management        |
| `controllers/scheduled-broadcast.controller.ts`    | Scheduled broadcast management    |
| `controllers/scheduled-single-email.controller.ts` | Scheduled single email management |

### DTOs (1 file)

| File                    | Lines | Purpose                             |
| ----------------------- | ----- | ----------------------------------- |
| `dto/send-email.dto.ts` | 232   | Zod schemas for all email endpoints |

### Types (1 file)

| File                   | Lines | Purpose              |
| ---------------------- | ----- | -------------------- |
| `types/email.types.ts` | 620   | All type definitions |

### Module files (2 files)

| File              | Purpose                  |
| ----------------- | ------------------------ |
| `email.module.ts` | NestJS module definition |
| `index.ts`        | Public exports           |

**Total: ~30 files, ~5000+ lines**

## 4. Dependencies Analysis

### NPM Packages to Install in `apps/api`

```
@sendgrid/mail@^8.1.6
@sendgrid/client@^8.1.6
@sendgrid/eventwebhook@^8.0.0
```

### Module Dependencies the Email Module Needs

| Dependency                                                       | Exists in New App? | Action                                                                         |
| ---------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `ConfigModule`                                                   | Yes (global)       | No action                                                                      |
| `SharedModule` (AuthGuard, LoggerService, SupabaseClientFactory) | Yes                | No action                                                                      |
| `DatabaseModule`                                                 | **No**             | Need to check if needed or if Supabase client factory suffices                 |
| `AuthModule`                                                     | **No**             | Need to check - the AuthGuard is in SharedModule                               |
| `QueueModule` (BullMQ)                                           | **No**             | Needed for broadcast/scheduled emails. Can defer if not porting queue features |
| `LoggerModule`                                                   | **No**             | LoggerService exists in SharedModule - may need to align                       |

## 5. Fix Options

### Option A: Full Copy-Paste Port (All 30 files)

- Copy the entire `modules/email/` directory as-is
- Install 3 npm packages
- Wire into `AppModule`
- Add env vars
- **Trade-off:** Brings everything including broadcast/scheduled/sequence features that may not have counterparts yet in 2.0

### Option B: Phased Port (Core First, Advanced Later)

**Phase 1 - Core email infrastructure:**

- `sendgrid.integration.ts` (integration layer)
- `email.types.ts` (types)
- `send-email.dto.ts` (DTOs)
- `unsubscribe-token.util.ts` (util)
- `email-send.service.ts` (sending)
- `domain-auth.service.ts` (domain management)
- `sender-identity.service.ts` (sender management)
- `webhook-processor.service.ts` (webhook handling)
- `unsubscribe.service.ts` (CAN-SPAM compliance)
- All 8 repositories
- Core controllers: `domains`, `send`, `webhooks`, `sender-identities`, `suppressions`, `unsubscribe`
- `email.module.ts` + `index.ts`

**Phase 2 - Advanced features (later):**

- `inbound-email.service.ts` (reply tracking)
- `reply-detection.service.ts` (sequence control)
- `broadcast-draft.service.ts` (broadcast drafts)
- Advanced controllers: `broadcast-drafts`, `scheduled-broadcast`, `scheduled-single-email`

## 6. Recommended Fix: Option B (Phased Port)

**Why:** The core email sending/domain/sender/webhook/unsubscribe functionality is self-contained and has no dependency on queue workers or broadcast/sequence systems that don't exist yet in 2.0. The advanced features depend on sequence enrollments, broadcast schedules, and BullMQ queues that aren't ported yet.

## 7. Detailed Execution Plan

| Phase | Step                                                                                            | Files          | Dependencies               |
| ----- | ----------------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| **0** | Install `@sendgrid/mail`, `@sendgrid/client`, `@sendgrid/eventwebhook` in `apps/api`            | `package.json` | None                       |
| **0** | Add `SENDGRID_API_KEY`, `SENDGRID_WEBHOOK_VERIFICATION_KEY` to `.env`                           | `.env`         | None                       |
| **1** | Copy `types/email.types.ts`                                                                     | 1 file         | None                       |
| **1** | Copy `dto/send-email.dto.ts`                                                                    | 1 file         | Types                      |
| **1** | Copy `utils/unsubscribe-token.util.ts`                                                          | 1 file         | None                       |
| **1** | Copy `integrations/sendgrid.integration.ts`                                                     | 1 file         | ConfigService, types       |
| **1** | Copy all 8 repositories                                                                         | 8 files        | Supabase, types            |
| **1** | Copy 5 core services (email-send, domain-auth, sender-identity, webhook-processor, unsubscribe) | 5 files        | Integration, repos, logger |
| **1** | Copy 6 core controllers (domains, send, webhooks, sender-identities, suppressions, unsubscribe) | 6 files        | Services, guards           |
| **1** | Create `email.module.ts` (Phase 1 subset)                                                       | 1 file         | All above                  |
| **1** | Wire into `AppModule`                                                                           | 1 edit         | EmailModule                |
| **1** | Create barrel exports (`index.ts` files)                                                        | 3 files        | All above                  |
| **2** | Copy `inbound-email.service.ts`, `reply-detection.service.ts`                                   | 2 files        | Repos, types               |
| **2** | Copy remaining controllers                                                                      | 3 files        | Services                   |
| **2** | Update `email.module.ts` with Phase 2 additions                                                 | 1 edit         | All Phase 2 files          |

## 8. Adaptation Needed (NOT straight copy-paste)

| Item                   | Legacy                            | New App                                | Action                                                             |
| ---------------------- | --------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `LoggerService` import | `../../logger/logger.service`     | `../../shared/services/logger.service` | Update import paths                                                |
| `DatabaseModule`       | Exists in legacy                  | Doesn't exist                          | Remove from imports, use `SupabaseClientFactory` from SharedModule |
| `AuthModule`           | Exists in legacy                  | AuthGuard is in SharedModule           | Remove from imports, guard is globally available                   |
| `QueueModule`          | BullMQ in legacy                  | Doesn't exist                          | Remove from Phase 1 module imports, defer queue-dependent features |
| Config path            | `sendgrid.apiKey` (nested config) | `SENDGRID_API_KEY` (direct env)        | Either add config factory or use `process.env` directly            |

## 9. Unknowns / Missing Evidence

- **LoggerService signature:** Need to verify the new app's `LoggerService` has the same `logError()` method signature as legacy. If not, adapter needed.
- **AuthGuard behavior:** Need to verify the new `AuthGuard` attaches `req.user` and `req.supabase` in the same format the email controllers expect (`AuthenticatedRequest` type).
- **Queue worker:** The legacy app has a separate `apps/queue-worker/` that handles broadcast/sequence email sending via BullMQ. This is NOT in the new app and would be a separate port effort.

## 10. Quality Control Summary

- [x] Read ALL legacy email module files (100% of every file)
- [x] Read new app architecture (AppModule, SharedModule, package.json)
- [x] Verified database tables exist (all 12 present)
- [x] Identified all npm dependencies needed
- [x] Identified all env vars needed
- [x] Identified all import path changes needed
- [x] Identified module dependency gaps (DatabaseModule, AuthModule, QueueModule)
- [x] Provided phased approach to avoid bringing unmet dependencies
- [x] Listed unknowns that need verification before coding

**Awaiting your approval to proceed with Phase 1 execution.**
