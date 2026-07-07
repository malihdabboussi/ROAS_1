# Vibey - Project Architecture

**Structure Authority - File Organization, Component Patterns, Directory Standards**

**Version 1.0 - The AI-Powered Landing Page Revolution**

---

## 📖 **Table of Contents**

**VISION & GOALS**

1. [Project Vision](#1-project-vision) ........................................ Line ~50
2. [Core Project Goals](#2-core-project-goals) ................................ Line ~80

**ARCHITECTURE PATTERNS** 3. [Component Architecture Philosophy](#3-component-architecture-philosophy) ... Line ~120 4. [File Organization & Directory Structure](#4-file-organization--directory-structure) Line ~220 5. [Component Organization & Categorization](#5-component-organization--categorization) Line ~320 6. [Feature Structure Standards](#6-feature-structure-standards) ............... Line ~520

**TEMPLATE SYSTEM** 7. [Template Architecture](#7-template-architecture) ........................... Line ~620 8. [Template Design System](#8-template-design-system) ......................... Line ~720

**CODE ORGANIZATION** 9. [Decomposition Guidelines (600 LOC Max)](#9-decomposition-guidelines-600-loc-max) Line ~820 10. [Naming Conventions](#10-naming-conventions) ............................... Line ~920 11. [Import & Export Patterns](#11-import--export-patterns) .................... Line ~980 12. [Monorepo Organization](#12-monorepo-organization) ......................... Line ~1040 13. [Agent Runtime Consistency](#13-agent-runtime-consistency) ................. Line ~1080 14. [Quick Checklist](#14-quick-checklist) ..................................... Line ~1120

---

<!-- ============================================================================
   SECTION 1: PROJECT VISION
   ============================================================================ -->

## 1. Project Vision

Build a dual-purpose system that serves as both the **Vibey website** AND a **landing page creation automation engine**. We're creating the infrastructure to generate infinite landing pages automatically while building our own brand presence.

---

<!-- ============================================================================
   SECTION 2: CORE PROJECT GOALS
   ============================================================================ -->

## 2. Core Project Goals

### **Goal 1: Vibey Website Development**

- **Objective**: Build the complete Vibey brand website using component-based architecture
- **Scope**: Landing pages, marketing pages, Protocol signup flows, community pages
- **Success Metrics**:
  - Conversion-optimized pages following King Kong style guidelines
  - Mobile-first, high-performance implementation
  - Seamless brand experience across all touchpoints

### **Goal 2: Landing Page Automation System**

- **Objective**: Create an AI-powered system that generates new landing pages automatically
- **Scope**: Template system + in-app orchestration (Supabase-authenticated admin tools) + GitHub/Vercel deployment pipeline
- **Success Metrics**:
  - Video → Transcription → Landing Page in under 10 minutes
  - Zero manual coding required for new page creation
  - Automatic deployment and URL generation

---

<!-- ============================================================================
   SECTION 3: COMPONENT ARCHITECTURE PHILOSOPHY
   ============================================================================ -->

## 3. Component Architecture Philosophy

Following the **Smart Components vs Dumb Components** pattern, with explicit Containers inside features and shared mutual files.

### **SMART COMPONENTS (Features)**

- Connect to external data sources (Supabase, APIs, AI services)
- Handle business logic and state management
- Manage data fetching, processing, and copy injection
- Located in `src/features/`
- Each feature is a closed ecosystem that includes its own types, hooks, services, components, and templates
- Inside a feature we have `containers/` and `components/`
- `containers/` hold the smart components (they orchestrate data and actions)
- `components/` inside the feature hold the dumb/presentational pieces specific to that feature
- **Purpose**: Maintainable, isolated features with clear contracts

### **DUMB COMPONENTS (Components)**

- Pure presentational components
- Receive data via props only
- No external dependencies or side effects
- Located in `src/components/` for cross-feature reuse
- **Purpose**: Reusable building blocks usable by any feature

### **Mutual Files**

- Cross-feature services, hooks, and types used in multiple features
- Located at the `src/lib/` root as first-class folders: `src/lib/services/`, `src/lib/hooks/`, `src/lib/types/`
- **Purpose**: Share logic without coupling features

**Example Feature Structure:**

```
src/features/offers/
├── containers/                    # Smart components (orchestration)
│   └── OfferCopilotWizardContainer.tsx
├── components/                    # Dumb components (UI)
│   ├── wizard/
│   │   ├── OfferWizardStepAudience.tsx
│   │   ├── OfferWizardStepOffer.tsx
│   │   └── OfferWizardStepPricing.tsx
│   └── common/
│       └── OfferPriceCard.tsx
├── hooks/                         # Feature-specific hooks
│   └── useOfferWizardState.ts
├── services/                      # Feature-specific services
│   └── offerWizard.service.ts
├── types/                         # Feature-specific types
│   └── offer-wizard.types.ts
└── index.ts                       # Barrel exports
```

---

<!-- ============================================================================
   SECTION 4: FILE ORGANIZATION & DIRECTORY STRUCTURE
   ============================================================================ -->

## 4. File Organization & Directory Structure

### **Services** (`/src/lib/services/`)

- External API integrations (Firecrawl, OpenRouter, etc.)
- Business logic that needs server environment
- **RULE:** If it uses `process.env`, it's server-side only
- Shared services used by multiple features

**Examples:**

- `scraping.service.ts` - Web scraping with fallback
- `openrouter.service.ts` - AI completions
- `supabase-server.ts` - Server-side database client
- `supabase-auth.ts` - Client-side auth client

### **API Routes** (`/src/app/api/`)

- Bridge between client components and services
- Handle authentication and validation
- Call services and return JSON responses
- **RULE:** Organized by FEATURE, not by resource type

**Feature-based structure:**

```
/api/
  ├── auth/              # Shared - Authentication
  ├── billing/           # Shared - Billing
  ├── profile/           # Shared - User profile
  ├── offers/            # Feature - Offers
  ├── funnel/            # Feature - Funnels
  ├── branding/          # Feature - Branding
  ├── campaigns/         # Feature - Campaigns
  ├── integrations/      # Feature - Integrations
  └── webhooks/          # Shared - External webhooks
```

### **Components** (`/src/components/`)

- Pure UI components (Dumb components)
- No external API calls, only props
- Reusable across different features
- Built with shadcn UI; token-only styles; variants control appearance

**Structure:**

```
/src/components/
  ├── ui/                # shadcn UI components (Button, Input, etc.)
  ├── shared/            # App-wide shared components
  └── layouts/           # Layout components
```

### **Features** (`/src/features/`)

- Smart components with business logic
- Can call API routes (not services directly)
- Handle state management and data fetching
- Each feature is self-contained

**Feature directory structure:**

```
/src/features/[feature-name]/
  ├── containers/        # Smart components (orchestration)
  ├── components/        # Feature-specific UI components
  ├── hooks/             # Feature-specific hooks
  ├── services/          # Feature-specific services (client-side)
  ├── types/             # Feature-specific types
  ├── config/            # Feature configuration
  └── index.ts           # Barrel exports
```

### **Shared Library** (`/src/lib/`)

Cross-feature utilities and helpers:

```
/src/lib/
  ├── services/          # Shared business services
  ├── hooks/             # Shared React hooks
  ├── types/             # Shared TypeScript types
  ├── utils/             # Pure utility functions
  ├── constants/         # App-wide constants
  ├── middleware/        # Request middleware (validation, rate limiting)
  └── schemas/           # Zod validation schemas
```

---

<!-- ============================================================================
   SECTION 5: COMPONENT ORGANIZATION & CATEGORIZATION
   ============================================================================ -->

## 5. Component Organization & Categorization

### **Component Folder Structure Philosophy**

Components within a feature should be organized by **purpose/category** rather than alphabetically or by complexity. This makes code discoverable and maintainable.

### **Standard Component Categories**

Based on actual patterns across features (Funnels, Offers, Campaigns, Branding, etc.):

| Category       | Purpose                    | Naming Convention                            | When to Use                                                    |
| -------------- | -------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| **`dialogs/`** | Modal/popup components     | `[Action][Feature]Dialog.tsx`                | Confirmation dialogs, create/edit modals, delete confirmations |
| **`wizard/`**  | Multi-step form components | `[Feature]WizardStep[Name].tsx`              | Onboarding flows, creation wizards, setup processes            |
| **`hub/`**     | Dashboard/overview views   | `[Feature]Hub.tsx`                           | Main feature dashboards, overview pages, central navigation    |
| **`list/`**    | List/table view components | `[Feature]List.tsx`, `[Feature]ListView.tsx` | Data tables, grid views, list items                            |
| **`detail/`**  | Single item detail views   | `[Feature]Detail[Element].tsx`               | Detail pages, single item views, preview components            |
| **`editor/`**  | Editor/builder components  | `[Feature]Editor[Element].tsx`               | Visual editors, WYSIWYG builders, configuration panels         |
| **`common/`**  | Shared within feature      | `[Element].tsx`                              | Reusable components within the feature only                    |
| **`forms/`**   | Form-related components    | `[Feature]Form[Element].tsx`                 | Form fields, input groups, validation components               |
| **`cards/`**   | Card components            | `[Feature]Card.tsx`                          | Grid cards, list cards, preview cards                          |

### **Examples from Actual Features**

**Funnels Feature:**

```
/features/funnels/components/
├── dialogs/                    # Modal components
│   ├── DeleteFunnelDialog.tsx
│   └── PublishConfirmDialog.tsx
├── wizard/                     # Creation wizard steps
│   ├── FunnelWizardStepSetup.tsx
│   ├── FunnelWizardStepPages.tsx
│   └── FunnelWizardStepReview.tsx
├── hub/                        # Main dashboard
│   └── FunnelsHub.tsx
├── list/                       # List views
│   ├── FunnelsListView.tsx
│   └── FunnelCard.tsx
├── detail/                     # Detail views
│   ├── FunnelDetailToolbar.tsx
│   ├── FunnelThemeSelector.tsx
│   └── FunnelPagesList.tsx
├── editor/                     # Funnel editor
│   └── FunnelEditor.tsx
└── common/                     # Shared within funnels
    └── FunnelStatusBadge.tsx
```

**Offers Feature:**

```
/features/offer/components/
├── dialogs/
│   ├── DeleteOfferDialog.tsx
│   └── ExportOfferDialog.tsx
├── wizard/
│   ├── OfferWizardStepAudience.tsx
│   ├── OfferWizardStepOffer.tsx
│   └── OfferWizardStepPricing.tsx
├── hub/
│   └── OffersHub.tsx
└── list/
    ├── OffersListView.tsx
    └── OfferCard.tsx
```

**Campaigns Feature:**

```
/features/campaigns/components/
├── dialogs/
│   ├── CreateCampaignDialog.tsx
│   └── DeleteCampaignDialog.tsx
├── hub/
│   └── CampaignsHub.tsx
└── map/                        # Specialized visualization
    ├── CustomerJourneyFunnel.tsx
    └── CampaignMapCanvas.tsx
```

### **When to Create Each Category**

**`dialogs/` - Create when:**

- ✅ You have 2+ modal/popup components
- ✅ Confirmation dialogs (delete, publish, pause)
- ✅ Create/edit forms in modals
- ✅ Multi-step dialogs

**`wizard/` - Create when:**

- ✅ You have a multi-step creation flow (3+ steps)
- ✅ Each step is a distinct component (150+ LOC per step)
- ✅ Wizard has branching logic or conditional steps
- ✅ Progressive disclosure of complexity

**`hub/` - Create when:**

- ✅ Main dashboard/overview for the feature
- ✅ Central navigation with tabs or sections
- ✅ Aggregated data display
- ✅ Quick actions and feature entry points

**`list/` - Create when:**

- ✅ Table/grid views of multiple items
- ✅ List item components used in multiple views
- ✅ Different list layouts (grid, table, compact)

**`detail/` - Create when:**

- ✅ Dedicated detail page for a single item
- ✅ Multiple components for different sections of detail view
- ✅ Toolbars, sidebars specific to detail view

**`editor/` - Create when:**

- ✅ Visual or WYSIWYG editor
- ✅ Configuration builder
- ✅ Canvas-based editing interface

**`common/` - Create when:**

- ✅ Components reused across multiple categories within the feature
- ✅ Small utility components (badges, tags, icons)
- ✅ Shared form fields specific to this feature
- ⚠️ **Don't use for cross-feature components** → Those go in `/src/components/`

**`forms/` - Create when:**

- ✅ Feature has 3+ form-related components
- ✅ Complex multi-field forms
- ✅ Reusable field groups

**`cards/` - Create when:**

- ✅ Feature has 3+ card variations
- ✅ Cards used in both grid and list views
- ✅ Preview cards, summary cards, detail cards

### **Category Decision Tree**

```
Is it a component for this feature?
├─ YES
│  ├─ Is it a modal/popup?
│  │  └─ YES → dialogs/
│  ├─ Is it a wizard step?
│  │  └─ YES → wizard/
│  ├─ Is it the main dashboard?
│  │  └─ YES → hub/
│  ├─ Is it for listing multiple items?
│  │  └─ YES → list/
│  ├─ Is it for showing single item details?
│  │  └─ YES → detail/
│  ├─ Is it an editor/builder?
│  │  └─ YES → editor/
│  ├─ Is it used across multiple categories?
│  │  └─ YES → common/
│  └─ Is it a form component?
│     └─ YES → forms/
└─ NO (used by multiple features)
   └─ Move to /src/components/
```

### **Naming Patterns by Category**

**Dialogs:**

```typescript
// Pattern: [Action][Feature]Dialog.tsx
DeleteFunnelDialog.tsx
CreateOfferDialog.tsx
PublishConfirmDialog.tsx
ExportCampaignDialog.tsx
```

**Wizard Steps:**

```typescript
// Pattern: [Feature]WizardStep[Name].tsx
FunnelWizardStepSetup.tsx
OfferWizardStepAudience.tsx
BrandingWizardStepColors.tsx
```

**Hub Components:**

```typescript
// Pattern: [Feature]Hub.tsx or [Feature][Section]Hub.tsx
FunnelsHub.tsx
OffersHub.tsx
CampaignsHub.tsx
```

**List Components:**

```typescript
// Pattern: [Feature]ListView.tsx, [Feature]Card.tsx
FunnelsListView.tsx
FunnelCard.tsx
OffersListView.tsx
OfferCard.tsx
```

**Detail Components:**

```typescript
// Pattern: [Feature]Detail[Element].tsx
FunnelDetailToolbar.tsx
FunnelDetailSidebar.tsx
OfferDetailPanel.tsx
```

**Editor Components:**

```typescript
// Pattern: [Feature]Editor[Element].tsx
FunnelEditor.tsx
FunnelEditorToolbar.tsx
FunnelEditorCanvas.tsx
```

**Common Components:**

```typescript
// Pattern: [Element].tsx (no feature prefix if truly shared within feature)
StatusBadge.tsx
TypeSelector.tsx
PriceCard.tsx
```

### **Special Cases: Domain-Specific Organization**

Some features require domain-specific categorization:

**Integrations Feature:**

```
/features/integrations/components/
├── airtable/                   # Provider-specific components
│   └── AirtableConfigForm.tsx
├── gohighlevel/
│   └── GoHighLevelSettings.tsx
└── general/                    # Shared integration components
    └── IntegrationCard.tsx
```

**Payments Feature:**

```
/features/payments/components/
├── checkout/                   # Checkout flow components
│   └── CheckoutForm.tsx
├── coupons/                    # Coupon management
│   └── CouponsList.tsx
├── paymentLinks/               # Payment links
│   └── PaymentLinkGenerator.tsx
└── products/                   # Product management
    └── ProductCard.tsx
```

**When to Use Domain-Specific Organization:**

- ✅ Feature has distinct sub-domains with minimal overlap
- ✅ Each sub-domain has 3+ components
- ✅ Clear separation of concerns between sub-domains
- ⚠️ Avoid over-nesting (max 2 levels: `components/category/Component.tsx`)

### **Anti-Patterns to Avoid**

**❌ Don't organize alphabetically:**

```
/components/
├── AddButton.tsx              # No context
├── DeleteDialog.tsx
├── EditForm.tsx
├── ListHeader.tsx
└── ViewCard.tsx
```

**❌ Don't mix purposes in same folder:**

```
/components/
├── hub/
│   ├── FunnelsHub.tsx         # ✅ Dashboard
│   ├── DeleteDialog.tsx       # ❌ Should be in dialogs/
│   └── WizardStepOne.tsx      # ❌ Should be in wizard/
```

**❌ Don't over-categorize:**

```
/components/
├── buttons/                   # Too granular
├── inputs/
├── modals/
│   ├── small/                 # Over-nested
│   └── large/
└── text/
```

**❌ Don't create category for 1 component:**

```
/components/
├── settings/                  # Only 1 component
│   └── SettingsPanel.tsx
```

→ Keep in `components/` root until you have 2+ settings components

### **Migration Strategy**

**When refactoring existing unorganized components:**

1. **Audit existing components** - List all components and their purposes
2. **Group by category** - Identify which belong to dialogs, wizard, list, etc.
3. **Create folders** - Only create categories with 2+ components
4. **Move files** - Move components to appropriate categories
5. **Update imports** - Update all import statements
6. **Update barrel exports** - Update `index.ts` to reflect new structure
7. **Test** - Verify nothing broke

**Example migration:**

```typescript
// Before
/features/funnels/components/
├── FunnelCard.tsx
├── FunnelsListView.tsx
├── DeleteFunnelDialog.tsx
├── FunnelDetailToolbar.tsx
├── FunnelWizardStepSetup.tsx
└── index.ts

// After (organized by category)
/features/funnels/components/
├── dialogs/
│   └── DeleteFunnelDialog.tsx
├── wizard/
│   └── FunnelWizardStepSetup.tsx
├── list/
│   ├── FunnelsListView.tsx
│   └── FunnelCard.tsx
├── detail/
│   └── FunnelDetailToolbar.tsx
└── index.ts
```

### **Checklist: Creating New Component**

Before creating a new component:

- [ ] Determine feature ownership (which feature does it belong to?)
- [ ] Check if it's cross-feature (if yes → `/src/components/`)
- [ ] Identify category (dialog, wizard, hub, list, detail, editor, common)
- [ ] Check if category folder exists (if not, create only if 2+ components)
- [ ] Follow naming convention for that category
- [ ] Update barrel exports (`index.ts`)
- [ ] Verify component file stays under 400 LOC (see Section 9: Decomposition Guidelines)

---

<!-- ============================================================================
   SECTION 6: FEATURE STRUCTURE STANDARDS
   ============================================================================ -->

## 6. Feature Structure Standards

### **When to Create a Feature**

Create a new feature when:

- ✅ Distinct business domain (Offers, Funnels, Campaigns)
- ✅ Has its own data models
- ✅ Requires multiple components working together
- ✅ Needs feature-specific state management
- ✅ Has dedicated API routes

### **Feature Isolation Rules**

1. **Features NEVER import from other features**
   - ❌ `import { OfferCard } from '@/features/offers'`
   - ✅ Extract to shared components if needed by multiple features

2. **Features CAN import from:**
   - ✅ Shared components (`@/components`)
   - ✅ Shared lib (`@/lib`)
   - ✅ Their own internal modules

3. **API routes organized by feature**
   - Working on Offers → ONLY touch `/api/offers/*`
   - Working on Funnels → ONLY touch `/api/funnel/*`
   - Never modify other features' API routes

### **Container Pattern (for Wizards/Complex Flows)**

For complex multi-step flows (wizards, onboarding, etc.):

**Container responsibilities:**

- Step routing (currentStep, next/back)
- Validation gates
- Branching logic
- Data fetching/mutations
- Side effects and external service calls
- State composition
- Passing clean props/callbacks to step components

**Step component responsibilities:**

- UI rendering only
- Minimal view logic
- Receive `value`, `errors`, and callbacks like `onChange`, `onNext`, `onBack`
- No direct API calls
- No business logic

**Example structure:**

```typescript
// Container: OfferCopilotWizardContainer.tsx (~400 LOC)
export function OfferCopilotWizardContainer() {
  const [currentStep, setCurrentStep] = useState(0)
  const [wizardState, setWizardState] = useState({})

  // Orchestration logic
  const handleNext = () => { /* validation + navigation */ }
  const handleBack = () => { /* navigation */ }
  const handleSubmit = async () => { /* API calls */ }

  return (
    <>
      {currentStep === 0 && (
        <OfferWizardStepAudience
          value={wizardState.audience}
          errors={errors.audience}
          onChange={handleAudienceChange}
          onNext={handleNext}
        />
      )}
      {currentStep === 1 && (
        <OfferWizardStepOffer
          value={wizardState.offer}
          errors={errors.offer}
          onChange={handleOfferChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
    </>
  )
}

// Step: OfferWizardStepAudience.tsx (~150 LOC)
export function OfferWizardStepAudience({ value, errors, onChange, onNext }) {
  return (
    <div>
      {/* Pure UI - no business logic */}
      <Input
        value={value.targetMarket}
        onChange={(e) => onChange({ ...value, targetMarket: e.target.value })}
      />
      <Button onClick={onNext}>Next</Button>
    </div>
  )
}
```

---

<!-- ============================================================================
   SECTION 7: TEMPLATE ARCHITECTURE
   ============================================================================ -->

## 7. Template Architecture

### **Single Source of Truth: Packages**

All funnel templates (landing pages, thank-you pages, etc.) live in the monorepo packages, NOT in individual apps.

```
✅ /packages/funnel-templates/src/templates/
   ├── LandingPage/
   │   ├── BasicGray.tsx
   │   └── BasicWhite.tsx
   └── ThankYou/
       ├── BasicGray.tsx
       └── BasicWhite.tsx

❌ /apps/web/src/features/funnels/templates/  [REMOVED - Legacy; use packages/funnel-templates]
```

### **Why Packages?**

1. **Shared Across Apps** - Used in `app`, `community`, `site`
2. **Single Source of Truth** - No duplicate/conflicting versions
3. **Easier Updates** - Change once, applies everywhere
4. **Better Testing** - Can test templates independently

### **Template Renderer**

- **Preview Mode** (`editMode={false}`): Direct render, no wrapper
- **Edit Mode** (`editMode={true}`): Wrapped in `.editor-canvas` for click handling

### **Import Pattern**

```typescript
// ✅ Correct - Import from packages
import { LandingTemplate } from '@Vibey/funnel-templates'
// ❌ Incorrect - Don't create local templates
import { LandingTemplate } from '../templates/landing/BasicGray'
```

---

<!-- ============================================================================
   SECTION 8: TEMPLATE DESIGN SYSTEM
   ============================================================================ -->

## 8. Template Design System

### **Responsive Typography (Mobile First)**

- **Mobile (0-640px)**: Smaller, readable sizes (48px headline)
- **Tablet (640-1024px)**: Medium scaling (80px headline)
- **Desktop (1024px+)**: Full impact (130px headline)

### **Visual Hierarchy (Max-Width)**

Elements constrained to create visual "funnel":

- **Headline**: `max-width: 1000px` (widest, most important)
- **Subheadline**: `max-width: 850px` (85% of headline)
- **Body Text**: `max-width: 600px` (optimal reading length)

**Utility classes:**

- `.max-w-headline` - 1000px
- `.max-w-subheadline` - 850px
- `.max-w-body` - 600px
- `.max-w-reading` - 65ch

### **Container Rules**

- **Landing Pages**: NO nested containers, use `w-full` + element max-widths
- **Thank You Pages**: Can use `.container-content` for focused layouts

**Why?**

- Landing pages need full-width control for sections
- Thank You pages benefit from centered, constrained layouts

### **Responsive Breakpoints**

```css
/* Mobile First - Base styles apply to 0-639px */
@media (min-width: 640px) {
  /* Tablet */
}
@media (min-width: 1024px) {
  /* Desktop */
}
@media (min-width: 1440px) {
  /* Large Desktop */
}
```

---

<!-- ============================================================================
   SECTION 9: DECOMPOSITION GUIDELINES (600 LOC MAX)
   ============================================================================ -->

## 9. Decomposition Guidelines (600 LOC Max)

### **Hard Limit: 600 Lines of Code per File**

- When a file approaches ~500 LOC, proactively extract subcomponents or hooks
- Pre-commit hook checks file size
- CI fails if limits exceeded

### **File Size Guidelines by Type**

| File Type     | Max LOC | Action at 80% (480 LOC)           |
| ------------- | ------- | --------------------------------- |
| **Container** | 600     | Extract step components or hooks  |
| **Component** | 400     | Split into smaller components     |
| **Hook**      | 300     | Extract sub-hooks or utilities    |
| **Service**   | 600     | Split into multiple services      |
| **API Route** | 400     | Extract business logic to service |
| **Types**     | 500     | Split by domain concept           |
| **Utility**   | 300     | Split by functionality            |

### **When to Split Further**

**Large forms:**

- Extract field groups into subcomponents
- Example: `PersonalInfoFields.tsx`, `AddressFields.tsx`

**Reused logic:**

- Extract custom hooks
- Example: `useStepNavigation`, `useWizardValidation`, `useFormPersistence`

**Heavy side effects:**

- Isolate in services to keep components lean
- Example: Move API orchestration to service layer

### **Containers-First for Complex Flows**

For wizards, onboarding, multi-step processes:

1. **Create Container** in `src/features/<feature>/containers/`
   - Orchestrates step routing (currentStep, next/back)
   - Handles validation gates and branching logic
   - Manages data fetching/mutations and external service calls
   - Composes state and passes clean props/callbacks to step components

2. **Steps are Components** under `src/features/<feature>/components/`
   - Each step is a separate file focused on UI + minimal view logic only
   - Receive `value`, `errors`, and callbacks like `onChange`, `onNext`, `onBack`
   - Keep each step under 150 LOC

3. **Optional Subcomponents** in `src/features/<feature>/components/common/`
   - Pure UI pieces reused across steps
   - Example: `AudienceSelector.tsx`, `PriceTierCard.tsx`

---

<!-- ============================================================================
   SECTION 10: NAMING CONVENTIONS
   ============================================================================ -->

## 10. Naming Conventions

### **Files & Folders**

| Type           | Convention                    | Example                           |
| -------------- | ----------------------------- | --------------------------------- |
| **Components** | PascalCase                    | `OfferCard.tsx`                   |
| **Containers** | PascalCase + Container suffix | `OfferCopilotWizardContainer.tsx` |
| **Hooks**      | camelCase + use prefix        | `useOfferWizardState.ts`          |
| **Services**   | camelCase + .service suffix   | `offerWizard.service.ts`          |
| **Types**      | camelCase + .types suffix     | `offer-wizard.types.ts`           |
| **Utils**      | camelCase + .utils suffix     | `validation.utils.ts`             |
| **API Routes** | kebab-case                    | `generate-copy/route.ts`          |
| **Folders**    | kebab-case                    | `offer-copilot/`                  |

### **Component Naming Patterns**

**Containers:**

- Format: `[Feature][Purpose]Container`
- Examples: `OfferCopilotWizardContainer`, `FunnelEditorContainer`

**Steps (Wizard components):**

- Format: `[Feature]WizardStep[Name]`
- Examples: `OfferWizardStepAudience`, `OfferWizardStepPricing`

**Feature-specific components:**

- Format: `[Feature][Element]`
- Examples: `OfferPriceCard`, `FunnelTemplateSelector`

**Shared components:**

- Format: `[Element]` (no feature prefix)
- Examples: `Button`, `Input`, `Card`

---

<!-- ============================================================================
   SECTION 11: IMPORT & EXPORT PATTERNS
   ============================================================================ -->

## 11. Import & Export Patterns

### **Barrel Files (index.ts)**

Use barrel files per folder to keep imports clean:

```typescript
// Import from barrel
import { OfferCard, OfferPriceCard } from '@/features/offers/components'
// ❌ WRONG - Deep imports
import { OfferCard } from '@/features/offers/components/OfferCard'
import { OfferPriceCard } from '@/features/offers/components/OfferPriceCard'

// ✅ CORRECT - Barrel export
// src/features/offers/components/index.ts
export { OfferCard } from './OfferCard'
export { OfferPriceCard } from './OfferPriceCard'
export { OfferWizardStepAudience } from './wizard/OfferWizardStepAudience'
```

### **Import Order Convention**

```typescript
// 1. External dependencies
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
// 2. Internal absolute imports (@/)
import { useOfferWizardState } from '@/features/offers/hooks'
import { offerWizardService } from '@/features/offers/services'
import type { OfferWizardState } from '../types'
// 3. Relative imports
import { OfferPriceCard } from './OfferPriceCard'
// 4. Styles/Assets
import './styles.css'
```

### **Export Patterns**

```typescript
// ✅ Named exports (preferred for components)
export function OfferCard() {}
export const useOfferWizardState = () => {}

// ✅ Default export (only for pages/routes)
export default function OfferPage() {}

// ❌ Avoid mixing default and named exports in same file
```

---

<!-- ============================================================================
   SECTION 12: MONOREPO ORGANIZATION
   ============================================================================ -->

## 12. Monorepo Organization

### **Workspace Structure**

```
Vibey2.0/
├── apps/
│   ├── web/                    # Main product (Next.js)
│   ├── website/                # Marketing site (Next.js)
│   ├── api/                    # Platform backend (NestJS)
│   ├── agent-api/              # Agent backend (NestJS)
│   ├── admin/                  # Admin app (Next.js)
│   ├── funnels/                # Funnels app (Next.js)
│   ├── mission-worker/         # Mission worker
│   ├── queue-worker/           # Queue worker
│   ├── openclaw/               # OpenClaw gateway
│   ├── chrome-extension/
│   └── docs/
├── packages/
│   ├── api-shared/             # Shared code across backends
│   └── funnel-templates/       # Shared funnel templates
├── .docs/guidelines/           # Development guidelines
├── documentation/              # Feature + utility docs
├── .documentation/             # Architecture + deep-dive docs
├── .cursor/                    # Cursor IDE commands
└── package.json                # Root workspace config
```

### **Package Management**

- **pnpm workspaces** for monorepo management
- Shared dependencies in root `package.json`
- App-specific dependencies in app `package.json`

### **Sharing Code Between Apps**

**Templates (packages/funnel-templates):**

```typescript
// Import in any app
import { LandingTemplate } from '@Vibey/funnel-templates'
```

**When to create a package:**

- ✅ Code used by 2+ apps
- ✅ Independent versioning needed
- ✅ Can be tested in isolation

**When to keep in app:**

- ❌ Used by only one app
- ❌ Tightly coupled to app logic
- ❌ Frequently changing with app changes

---

## 13. Agent Runtime Consistency

### Unified Runtime Resolver Rule

Team Chat (`apps/agent-api`) and Mission Control (`apps/mission-worker`) must resolve runtime identity through dedicated `AgentRuntimeService` implementations that enforce the same mapping contract:

- `system` level agents route through gateway agent id `vibey`
- `c_level` and `manager` levels route through gateway agent id `manager`
- `employee` level routes through gateway agent id `employee`

No feature/service should hand-roll level→gateway mapping logic inline. Session key generation must also use the runtime service so Team Chat and Mission Control produce deterministic, compatible keys.

### Delegation-First Leadership Contract

For cross-domain leadership (`c_level` + `shared`), architecture intent is:

- leadership creates and manages missions
- workers execute domain deliverables
- leadership reviews and reroutes

This keeps CEO/COO behavior consistent across chat and mission orchestration paths, and prevents direct deliverable execution drift.

---

<!-- ============================================================================
   SECTION 14: QUICK CHECKLIST
   ============================================================================ -->

## 14. Quick Checklist

### **Before Creating a New Feature**

- [ ] Does it need external API calls? → Create service + API route (see `.docs/guidelines/development/code-guidelines.md`)
- [ ] Does it need authentication? → Add auth check in API route
- [ ] Does it modify data? → Use server-side Supabase client
- [ ] Is it reusable UI? → Put in `/components/`
- [ ] Is it business logic? → Put in `/features/`
- [ ] File size will stay under 600 LOC? → Plan decomposition if needed

### **Before Deploying**

- [ ] No `process.env` usage in client components (see `.docs/guidelines/development/code-guidelines.md`)
- [ ] All API routes have error handling
- [ ] Authentication checks in protected routes
- [ ] Environment variables properly set
- [ ] No files exceed 600 LOC limit
- [ ] Barrel exports (`index.ts`) updated
- [ ] UI follows design tokens (see `.docs/guidelines/design/design-guidelines.md`)

### **Component Organization Checklist**

- [ ] Components organized by category (dialogs, wizard, hub, list, detail, editor, common)
- [ ] Only created category folder when 2+ components exist
- [ ] Followed naming convention for component category
- [ ] Updated barrel exports (`index.ts`) after creating folders
- [ ] Cross-feature components moved to `/src/components/`
- [ ] No over-nesting (max 2 levels)

### **Feature Isolation Checklist**

- [ ] Feature doesn't import from other features
- [ ] API routes organized by feature (not shared across features)
- [ ] Shared code extracted to `/lib` or `/components`
- [ ] Feature has its own types/hooks/services folders
- [ ] Feature exports via barrel file (`index.ts`)

### **Structure Validation**

- [ ] Containers orchestrate, components render (smart/dumb separation)
- [ ] Services in correct location (feature vs lib)
- [ ] Types defined in correct location (feature vs lib)
- [ ] Hooks follow single responsibility principle
- [ ] No circular dependencies

---

**For detailed patterns, see:**

- Code implementation: `.docs/guidelines/development/code-guidelines.md`
- UI/UX standards: `.docs/guidelines/design/design-guidelines.md`
- Backend architecture: `.docs/guidelines/architecture/backend-architecture.md`
