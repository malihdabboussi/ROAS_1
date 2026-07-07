# Vibey - Microservices Code Guidelines

**Backend ↔ Worker Communication Patterns - HOW to Build Background Processing**

**Quick Reference for Microservice Development**

---

## 📖 **Table of Contents**

**CRITICAL - READ FIRST** 0. [The Golden Rule: Backend CREATES, Worker UPDATES](#0-the-golden-rule-backend-creates-worker-updates) ... Line ~50
0.5. [Context Gathering Protocol (MANDATORY)](#05-context-gathering-protocol-mandatory) ... Line ~150

**ARCHITECTURE PATTERNS**

1. [Microservice Architecture Overview](#1-microservice-architecture-overview) .......... Line ~250
2. [Background Generation Flow](#2-background-generation-flow) .......................... Line ~350
3. [Job Data Contracts](#3-job-data-contracts) .......................................... Line ~500
4. [Worker Processing Patterns](#4-worker-processing-patterns) .......................... Line ~650

**IMPLEMENTATION PATTERNS** 5. [Backend: Preparing Data for Worker](#5-backend-preparing-data-for-worker) ........... Line ~800 6. [Worker: Processing Jobs](#6-worker-processing-jobs) ................................. Line ~950 7. [Database Client Patterns](#7-database-client-patterns) .............................. Line ~1100 8. [Error Handling & Retries](#8-error-handling--retries) ............................... Line ~1250

**COMMON PATTERNS** 9. [Notification Patterns](#9-notification-patterns) .................................... Line ~1400 10. [Status & Progress Tracking](#10-status--progress-tracking) ......................... Line ~1500 11. [Common Mistakes to Avoid](#11-common-mistakes-to-avoid) ............................ Line ~1600

---

<!-- ============================================================================
   SECTION 0: THE GOLDEN RULE
   ============================================================================ -->

## 0. The Golden Rule: Backend CREATES, Worker UPDATES

### **⚠️ CRITICAL: Never Let Workers CREATE Primary Records**

**The Pattern:**

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌──────────┐
│   Frontend  │──────│   Backend   │──────│   Worker    │──────│ Database │
│             │      │             │      │             │      │          │
│ 1. User     │      │ 2. CREATE   │      │ 4. UPDATE   │      │          │
│    sends    │──────│    record   │──────│    with AI  │      │          │
│    data     │      │    in DB    │      │    content  │      │          │
│             │      │ 3. Queue    │      │ 5. Notify   │      │          │
│             │      │    job      │      │             │      │          │
└─────────────┘      └─────────────┘      └─────────────┘      └──────────┘
```

### **Why This Pattern?**

1. **Immediate User Feedback**: User can see their record immediately (even if content is generating)
2. **Prevents 404 Errors**: Record exists when user navigates to it
3. **RLS Compliance**: Backend creates with user's session (RLS enforced)
4. **Decoupled Processing**: Worker failure doesn't lose user's data
5. **Resumable**: Worker can retry without recreating records

### **The Anti-Pattern (DON'T DO THIS)**

```typescript
// ❌ WRONG - Worker creates records
// services-worker/funnels/processor.ts
async process(job: Job<FunnelGenerationJobData>) {
  // Worker tries to CREATE funnel - BAD!
  const { error } = await this.supabase
    .from('funnels')
    .insert({ ... }); // FK constraints fail, RLS issues, etc.
}
```

### **The Correct Pattern**

```typescript
// ✅ CORRECT - Backend creates, Worker updates

// app-backend/funnels/controller.ts
@Post('generate-background')
async generateBackground(@Req() req, @Body() dto) {
  // 1. Backend CREATES record via service
  const result = await this.creationService.createForBackgroundGeneration(
    req.supabase,  // RLS-enforced client
    req.user.id,
    dto,
  );

  // 2. Queue job for worker
  await this.queueService.scheduleFunnelGeneration({
    funnelId: result.funnelId, // Pass ID of EXISTING record
    ...dto,
  });

  return { success: true, funnelId: result.funnelId };
}

// services-worker/funnels/processor.ts
async process(job: Job<FunnelGenerationJobData>) {
  const { funnelId } = job.data;

  // Worker only UPDATES existing record
  const content = await this.aiService.generateContent(job.data);

  await this.supabase
    .from('funnel_pages')
    .update({ content })  // UPDATE, not INSERT
    .eq('funnel_id', funnelId);
}
```

### **The Pattern Applies To:**

| Feature          | Backend Creates      | Worker Updates           |
| ---------------- | -------------------- | ------------------------ |
| **Offers**       | Offer record         | Step 1-5 AI content      |
| **Funnels**      | Funnel + empty pages | Page content             |
| **Campaigns**    | Campaign record      | Metadata, AI suggestions |
| **Lead Magnets** | Lead magnet record   | Generated content        |

---

<!-- ============================================================================
   SECTION 0.5: CONTEXT GATHERING
   ============================================================================ -->

## 0.5. Context Gathering Protocol (MANDATORY)

### **Before ANY Microservice Code Change:**

1. **Read the ENTIRE existing flow**
   - Frontend API call → Backend endpoint → Queue service → Worker processor
   - All 4 files, 100% of each

2. **Understand the job data contract**
   - What does backend send?
   - What does worker expect?
   - Are they aligned?

3. **Check existing patterns**
   - How do offers do it? (WORKS)
   - How do campaigns do it? (WORKS)
   - Follow the same pattern

### **Files to Read for Each Feature:**

```
Frontend:
  apps/web/src/features/[feature]/services/*-backend-api.ts
  apps/web/src/features/[feature]/hooks/useGenerate.ts

Backend:
  apps/app-backend/src/modules/[feature]/controllers/*.controller.ts
  apps/app-backend/src/modules/[feature]/services/*.service.ts
  apps/app-backend/src/modules/queue/types/queue.types.ts

Worker:
  apps/services-worker/src/modules/[feature]/processors/*.processor.ts
  apps/services-worker/src/modules/[feature]/services/*.service.ts
  apps/services-worker/src/modules/[feature]/types/index.ts
```

---

<!-- ============================================================================
   SECTION 1: MICROSERVICE ARCHITECTURE OVERVIEW
   ============================================================================ -->

## 1. Microservice Architecture Overview

### **Application Components**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (app)                                  │
│  Next.js 15 - User Interface, API calls to backend                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (app-backend)                              │
│  NestJS - HTTP API, Authentication, Queue Scheduling                         │
│  - Validates input (Zod)                                                     │
│  - Creates records (via services/repositories)                               │
│  - Schedules jobs to Redis                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│        REDIS (BullMQ)          │  │        SUPABASE                 │
│  - Job queues                  │  │  - PostgreSQL database          │
│  - Job scheduling              │  │  - RLS policies                 │
│  - Retry management            │  │  - Storage                      │
└────────────────────────────────┘  └────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKER (services-worker)                             │
│  NestJS + BullMQ - Background Job Processing                                 │
│  - Processes jobs from Redis queues                                          │
│  - Calls external APIs (OpenRouter, etc.)                                    │
│  - Updates records in Supabase                                               │
│  - Sends notifications on completion                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Communication Flow**

```
1. Frontend → Backend: HTTP request with user data
2. Backend → Database: CREATE record (RLS-enforced)
3. Backend → Redis: Schedule job with record ID
4. Worker ← Redis: Pick up job from queue
5. Worker → External API: Call AI/service
6. Worker → Database: UPDATE record (SERVICE_ROLE)
7. Worker → Database: Create notification
8. Frontend ← Polling/Webhook: Get updated data
```

---

<!-- ============================================================================
   SECTION 2: BACKGROUND GENERATION FLOW
   ============================================================================ -->

## 2. Background Generation Flow

### **Complete Flow Diagram**

```
FRONTEND                    BACKEND                      WORKER
────────────────────────────────────────────────────────────────────────

User clicks               POST /generate-background
"Generate"    ──────────▶    │
                             │ 1. Validate input (Zod)
                             │ 2. Check entitlements
                             │ 3. Create record via Service
                             │    └─▶ Repository.create()
                             │ 4. Create child records (pages, etc.)
                             │ 5. Schedule job to Redis
                             │
              ◀──────────────┤ Return: { funnelId, jobId }
                             │
User sees                    │
"Creating..."                │
                             │
                             │                          Job received
                             │                               │
                             │                          1. Load context
                             │                          2. Call AI API
                             │                          3. UPDATE record
                             │                          4. Create notification
                             │                               │
              ◀──────────────┼───────────────────────────────┤
User gets                    │                          Job complete
notification                 │
```

### **Backend Responsibilities**

```typescript
// app-backend: Controller + Service pattern
@Post('generate-background')
async generateBackground(@Req() req, @Body() dto) {
  // 1. Validate input (Zod pipe)
  // 2. Check entitlements
  const limit = await this.entitlementsService.checkLimit(req.user.id);
  if (!limit.allowed) return { error: 'TIER_LIMIT_REACHED' };

  // 3. Create records via Service (NOT direct DB)
  const result = await this.creationService.createForBackgroundGeneration(
    req.supabase,
    req.user.id,
    dto,
  );

  // 4. Queue job for worker
  const job = await this.queueService.scheduleGeneration({
    recordId: result.id,
    userId: req.user.id,
    ...dto,
  });

  return { success: true, id: result.id, jobId: job.jobId };
}
```

### **Worker Responsibilities**

```typescript
// services-worker: Processor + Service pattern
@Processor(QUEUE_NAME)
export class FeatureProcessor extends WorkerHost {
  async process(job: Job<JobData>) {
    const { recordId, userId } = job.data

    // 1. Load context (offer data, prompts, etc.)
    const context = await this.service.loadContext(recordId)

    // 2. Process (call AI, transform data)
    const result = await this.service.generateContent(context)

    // 3. UPDATE existing record (NOT INSERT)
    await this.service.saveContent(recordId, result)

    // 4. Update status
    await this.updateStatus(recordId, 'complete')

    // 5. Send notification
    await this.notificationService.create(userId, 'GENERATION_COMPLETE')

    return { success: true }
  }
}
```

---

<!-- ============================================================================
   SECTION 3: JOB DATA CONTRACTS
   ============================================================================ -->

## 3. Job Data Contracts

### **CRITICAL: Backend and Worker MUST Use Same Types**

The job data contract defines what backend sends and worker expects. **Mismatches cause bugs.**

### **Define Types in Backend (Source of Truth)**

```typescript
// app-backend/src/modules/queue/types/queue.types.ts

export interface FunnelGenerationJobData {
  // Required fields - worker MUST receive these
  funnelId: string
  userId: string
  funnelType: 'lead-magnet' | 'call-booking' | 'webinar'
  offerId: string

  // Optional fields - worker can handle absence
  funnelTitle?: string
  funnelDescription?: string
  instructions?: string
  transcript?: string

  // Template configuration
  optInTemplateSlug?: string
  confirmationTemplateSlug?: string

  // Feature-specific
  calendarUrl?: string // call-booking
  webinarTopics?: WebinarTopic[] // webinar
}
```

### **Mirror Types in Worker**

```typescript
// services-worker/src/modules/funnels/types/index.ts

// MUST match backend queue.types.ts exactly
export interface FunnelGenerationJobData {
  funnelId: string
  userId: string
  funnelType: 'lead-magnet' | 'call-booking' | 'webinar'
  offerId: string

  funnelTitle?: string
  funnelDescription?: string
  instructions?: string
  transcript?: string

  optInTemplateSlug?: string
  confirmationTemplateSlug?: string

  calendarUrl?: string
  webinarTopics?: WebinarTopic[]
}
```

### **Validation Checklist**

Before implementing background generation:

- [ ] Job interface defined in `app-backend/src/modules/queue/types/queue.types.ts`
- [ ] Job interface mirrored in `services-worker/src/modules/[feature]/types/index.ts`
- [ ] All required fields marked as required (not optional)
- [ ] All optional fields have defaults or null handling in worker
- [ ] Backend passes ALL fields worker needs (no assumptions)
- [ ] Worker validates job data at start of processing

---

<!-- ============================================================================
   SECTION 4: WORKER PROCESSING PATTERNS
   ============================================================================ -->

## 4. Worker Processing Patterns

### **Standard Processor Structure**

```typescript
// services-worker/src/modules/[feature]/processors/[feature].processor.ts

@Processor(QUEUE_NAME, { concurrency: 5 })
export class FeatureProcessor extends WorkerHost {
  private readonly logger = new Logger(FeatureProcessor.name)

  constructor(
    private readonly service: FeatureGenerationService,
    private readonly databaseService: DatabaseService,
  ) {
    super()
  }

  async process(job: Job<JobData>): Promise<ProcessResult> {
    const { recordId, userId } = job.data
    const startTime = Date.now()

    this.logger.log(`🎯 [Job ${job.id}] Starting: ${recordId}`)

    try {
      // 1. Validate job data
      this.validateJobData(job.data)

      // 2. Update status to 'processing'
      await this.updateStatus(recordId, 'processing')

      // 3. Process the job
      const result = await this.service.process(job.data, job)

      // 4. Update status to 'complete'
      await this.updateStatus(recordId, 'complete')

      // 5. Send notification
      await this.createNotification(userId, recordId)

      const duration = Date.now() - startTime
      this.logger.log(`✅ [Job ${job.id}] Complete in ${duration}ms`)

      return { success: true, duration }
    } catch (error) {
      this.logger.error(`❌ [Job ${job.id}] Failed: ${error.message}`)
      await this.updateStatus(recordId, 'failed')
      throw error // Re-throw for BullMQ retry
    }
  }

  private validateJobData(data: JobData): void {
    if (!data.recordId) throw new Error('Missing recordId')
    if (!data.userId) throw new Error('Missing userId')
  }

  private async updateStatus(recordId: string, status: string): Promise<void> {
    await this.databaseService.supabase
      .from('records')
      .update({ processing_status: status })
      .eq('id', recordId)
  }
}
```

### **Multi-Step Processing Pattern (Like Offers)**

```typescript
// For complex generation with multiple steps
async process(job: Job<JobData>): Promise<ProcessResult> {
  const { recordId } = job.data;

  // Determine starting step (resume from checkpoint if retrying)
  const startStep = await this.getStartStep(recordId);

  // Process each step sequentially with checkpointing
  for (let step = startStep; step <= TOTAL_STEPS; step++) {
    await job.updateProgress((step / TOTAL_STEPS) * 100);

    const result = await this.service.processStep(recordId, step);

    if (!result.success) {
      throw new Error(`Step ${step} failed: ${result.error}`);
    }

    // Checkpoint: Save progress so retry resumes from here
    await this.saveCheckpoint(recordId, step);
  }

  return { success: true };
}
```

---

<!-- ============================================================================
   SECTION 5: BACKEND - PREPARING DATA FOR WORKER
   ============================================================================ -->

## 5. Backend: Preparing Data for Worker

### **Controller → Service → Queue Pattern**

```typescript
// Controller: HTTP handling only
@Controller('feature')
export class FeatureController {
  @Post('generate-background')
  async generateBackground(@Req() req, @Body() dto) {
    // 1. Delegate to service (NOT direct DB operations)
    const result = await this.creationService.createForBackgroundGeneration(
      req.supabase,
      req.user.id,
      dto,
    )

    if (!result.success) {
      throw new HttpException(result.error, HttpStatus.BAD_REQUEST)
    }

    // 2. Queue job (service is already injected)
    const job = await this.queueService.scheduleGeneration(result.jobData)

    return { success: true, id: result.id, jobId: job.jobId }
  }
}
```

### **Service: Create Records + Prepare Job Data**

```typescript
// Service: Business logic + repository calls
@Injectable()
export class FeatureCreationService {
  async createForBackgroundGeneration(
    supabase: SupabaseClient,
    userId: string,
    input: CreateInput,
  ): Promise<CreateResult> {
    // 1. Create main record via repository
    const record = await this.repository.create(supabase, userId, {
      title: input.title,
      status: 'creating',
      processing_status: 'pending',
    })

    if (!record) {
      return { success: false, error: 'Failed to create record' }
    }

    // 2. Create child records (pages, steps, etc.)
    await this.childRepository.createMany(supabase, childRecords)

    // 3. Return ID for queue job
    return {
      success: true,
      id: record.id,
      jobData: {
        recordId: record.id,
        userId,
        ...input,
      },
    }
  }
}
```

### **Queue Service: Schedule Jobs**

```typescript
// Queue service: Adds jobs to Redis
@Injectable()
export class QueueService {
  constructor(@InjectQueue(FEATURE_QUEUE) private queue: Queue) {}

  async scheduleGeneration(data: JobData): Promise<{ jobId: string }> {
    const job = await this.queue.add('generate', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    })

    return { jobId: job.id as string }
  }
}
```

---

<!-- ============================================================================
   SECTION 6: WORKER - PROCESSING JOBS
   ============================================================================ -->

## 6. Worker: Processing Jobs

### **Service Pattern for AI Generation**

```typescript
// services-worker/src/modules/[feature]/services/[feature]-generation.service.ts

@Injectable()
export class FeatureGenerationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  private get supabase() {
    return this.databaseService.supabase // SERVICE_ROLE client
  }

  async process(data: JobData, job?: Job): Promise<ProcessResult> {
    // 1. Load context from database
    const context = await this.loadContext(data)

    // 2. Generate content via AI
    const content = await this.generateContent(context, job)

    // 3. Save to database (UPDATE existing records)
    await this.saveContent(data.recordId, content)

    return { success: true }
  }

  private async loadContext(data: JobData): Promise<Context> {
    // Load offer data, prompts, templates, etc.
    const { data: offer } = await this.supabase
      .from('offers')
      .select('*')
      .eq('id', data.offerId)
      .single()

    return { offer, ...data }
  }

  private async generateContent(context: Context, job?: Job): Promise<Content> {
    // Log progress
    if (job) await job.log('🤖 Calling AI API...')

    const response = await this.openRouterService.complete({
      messages: [{ role: 'user', content: buildPrompt(context) }],
      response_format: { type: 'json_object' },
    })

    return JSON.parse(response.content)
  }

  private async saveContent(recordId: string, content: Content): Promise<void> {
    // UPDATE existing records (NOT INSERT)
    const { error } = await this.supabase
      .from('record_pages')
      .update({ content })
      .eq('record_id', recordId)

    if (error) {
      throw new Error(`Failed to save content: ${error.message}`)
    }
  }
}
```

---

<!-- ============================================================================
   SECTION 7: DATABASE CLIENT PATTERNS
   ============================================================================ -->

## 7. Database Client Patterns

### **Backend: RLS-Enforced Client**

```typescript
// Backend uses user's session - RLS enforced
// apps/app-backend/src/modules/auth/auth.guard.ts

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = extractToken(request)

    // Create client with user's JWT - RLS enforced
    request.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    // User can only see/modify their own data
    return true
  }
}
```

### **Worker: Service Role Client**

```typescript
// Worker uses SERVICE_ROLE - bypasses RLS
// apps/services-worker/src/lib/services/database.service.ts

@Injectable()
export class DatabaseService implements OnModuleInit {
  public supabase: SupabaseClient

  onModuleInit() {
    // SERVICE_ROLE key - bypasses RLS
    // Worker needs this because jobs don't have user session
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // SERVICE_ROLE
    )
  }
}
```

### **Why Workers Use SERVICE_ROLE**

| Aspect           | Backend (RLS)    | Worker (SERVICE_ROLE) |
| ---------------- | ---------------- | --------------------- |
| **User Session** | Has JWT          | No user session       |
| **Data Access**  | User's data only | All data              |
| **Use Case**     | CRUD operations  | Background processing |
| **Security**     | RLS policies     | Trust via job data    |

**Important:** Workers trust the job data from backend. The backend already validated user ownership when creating the record. Worker just updates records the backend created.

---

<!-- ============================================================================
   SECTION 8: ERROR HANDLING & RETRIES
   ============================================================================ -->

## 8. Error Handling & Retries

### **BullMQ Retry Configuration**

```typescript
// Queue configuration with retries
await this.queue.add('generate', data, {
  attempts: 3, // Max retry attempts
  backoff: {
    type: 'exponential', // Exponential backoff
    delay: 5000, // Initial delay: 5 seconds
  },
  // After 3 attempts: 5s, 10s, 20s = 35s total wait
})
```

### **Processor Error Handling**

```typescript
async process(job: Job<JobData>): Promise<ProcessResult> {
  try {
    return await this.processInternal(job);
  } catch (error) {
    // Log detailed error
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);

    // Update status to 'failed'
    await this.updateStatus(job.data.recordId, 'failed');

    // Re-throw for BullMQ retry (if attempts remaining)
    throw error;
  }
}
```

### **Idempotent Operations**

```typescript
// Worker operations should be idempotent (safe to retry)
async saveContent(recordId: string, content: Content): Promise<void> {
  // ✅ UPDATE is idempotent - safe to retry
  const { error } = await this.supabase
    .from('pages')
    .update({ content })
    .eq('record_id', recordId);

  // ❌ INSERT would create duplicates on retry
  // Don't use INSERT in worker processing logic
}
```

### **Retry-Safe Patterns**

```typescript
// Use upsert for worker operations that might retry
async saveStep(recordId: string, step: number, data: StepData): Promise<void> {
  // Upsert: Insert if new, update if exists
  const { error } = await this.supabase
    .from('record_steps')
    .upsert({
      record_id: recordId,
      step_number: step,
      data,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'record_id,step_number',
    });
}
```

---

<!-- ============================================================================
   SECTION 9: NOTIFICATION PATTERNS
   ============================================================================ -->

## 9. Notification Patterns

### **Creating Notifications on Job Complete**

```typescript
// services-worker: Create notification after processing
async createNotification(
  userId: string,
  recordId: string,
  type: 'success' | 'error',
): Promise<void> {
  const templates = {
    success: {
      type: 'funnel_generated',
      title: 'Funnel Ready!',
      message: 'Your funnel has been generated successfully.',
    },
    error: {
      type: 'funnel_failed',
      title: 'Generation Failed',
      message: 'There was an error generating your funnel.',
    },
  };

  const template = templates[type];

  await this.supabase.from('notifications').insert({
    user_id: userId,
    type: template.type,
    title: template.title,
    message: template.message,
    metadata: { record_id: recordId },
    read: false,
  });
}
```

### **Frontend Polling Pattern**

```typescript
// Frontend: Poll for status updates
const { data, isLoading } = useQuery({
  queryKey: ['funnel', funnelId],
  queryFn: () => funnelsBackendApi.get(funnelId),
  refetchInterval: (query) => {
    // Poll every 5s while processing
    const status = query.state.data?.processing_status
    return status === 'pending' || status === 'processing' ? 5000 : false
  },
})
```

---

<!-- ============================================================================
   SECTION 10: STATUS & PROGRESS TRACKING
   ============================================================================ -->

## 10. Status & Progress Tracking

### **Status States**

```typescript
// Standard status states for background processing
type ProcessingStatus =
  | 'pending' // Job queued, not started
  | 'processing' // Job in progress
  | 'complete' // Job finished successfully
  | 'failed' // Job failed (may retry)
  | 'cancelled' // Job cancelled by user

// Additional funnel-specific status
type FunnelStatus =
  | 'creating' // Background generation in progress
  | 'draft' // Created, ready for editing
  | 'published' // Live
  | 'paused' // Temporarily disabled
  | 'archived' // Soft deleted
```

### **Progress Updates via BullMQ**

```typescript
// Update job progress for frontend tracking
async processStep(job: Job, step: number, totalSteps: number): Promise<void> {
  const progress = (step / totalSteps) * 100;
  await job.updateProgress(progress);
  await job.log(`📍 Step ${step}/${totalSteps} complete`);
}
```

### **Database Status Updates**

```typescript
// Update status in database
async updateProcessingStatus(
  recordId: string,
  status: ProcessingStatus,
): Promise<void> {
  await this.supabase
    .from('funnels')
    .update({
      processing_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);
}
```

---

<!-- ============================================================================
   SECTION 11: COMMON MISTAKES TO AVOID
   ============================================================================ -->

## 11. Common Mistakes to Avoid

### **Architecture Violations**

1. **❌ CRITICAL: Worker CREATES primary records**
   - Worker should only UPDATE records created by backend
   - Backend creates with RLS, worker updates with SERVICE_ROLE

2. **❌ CRITICAL: Direct DB operations in controller**
   - Controllers delegate to services
   - Services use repositories for DB operations

3. **❌ CRITICAL: Job data contract mismatch**
   - Backend and worker MUST use same types
   - Define in backend, mirror in worker

4. **❌ HIGH: Missing checkpoints for multi-step jobs**
   - Save progress after each step
   - Allow retry to resume from checkpoint

5. **❌ HIGH: Non-idempotent worker operations**
   - Use UPDATE/UPSERT, not INSERT
   - Worker operations may be retried

6. **❌ MEDIUM: Missing status updates**
   - Update status at start/end of processing
   - Frontend needs to show progress

7. **❌ MEDIUM: No error notifications**
   - Create notification on failure
   - User should know when generation fails

### **Data Flow Violations**

8. **❌ CRITICAL: Worker assumes data exists**
   - Backend MUST create records before queueing job
   - Worker validates job data at start

9. **❌ HIGH: Missing required fields in job data**
   - Pass ALL fields worker needs
   - Don't make worker fetch what backend knows

10. **❌ MEDIUM: Not handling job failures**
    - Set up retry configuration
    - Log errors with context
    - Update status on failure

---

## 🎯 **Quick Checklist**

### **Before Implementing Background Generation**

- [ ] Job data interface defined in backend `queue.types.ts`
- [ ] Job data interface mirrored in worker `types/index.ts`
- [ ] Backend creates records via service/repository (NOT direct DB)
- [ ] Backend passes record ID to worker (NOT raw data to insert)
- [ ] Worker UPDATES existing records (NOT INSERT)
- [ ] Worker uses SERVICE_ROLE client
- [ ] Retry configuration set up
- [ ] Status updates implemented
- [ ] Notifications on completion/failure
- [ ] Frontend polling for status

### **Pattern Reference**

```
✅ CORRECT FLOW:
Frontend → Backend (CREATE via Service) → Queue Job → Worker (UPDATE)

❌ WRONG FLOW:
Frontend → Backend (Queue Job) → Worker (CREATE)
```

---

**For more patterns, see:**

- Backend architecture: `@.docs/guidelines/development/code-guidelines-backend.md`
- Frontend architecture: `@.docs/guidelines/development/code-guidelines.md`
- Project architecture: `.docs/guidelines/architecture/project-architecture.md`

---

_Remember: Backend CREATES, Worker UPDATES. Never let workers create primary records. Always use service/repository pattern in backend._
