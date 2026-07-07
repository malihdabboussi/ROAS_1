# Vibey - Project Architecture

**Structure Authority - File Organization, Component Patterns, Directory Standards**

**Version 1.0 - The AI-Powered Landing Page Revolution**

---

## Table of Contents

**VISION & GOALS**

1. [Project Vision](#1-project-vision)
2. [Core Project Goals](#2-core-project-goals)

**ARCHITECTURE PATTERNS** 3. [Component Architecture Philosophy](#3-component-architecture-philosophy) 4. [File Organization & Directory Structure](#4-file-organization--directory-structure) 5. [Component Organization & Categorization](#5-component-organization--categorization) 6. [Feature Structure Standards](#6-feature-structure-standards)

**TEMPLATE SYSTEM** 7. [Template Architecture](#7-template-architecture) 8. [Template Design System](#8-template-design-system)

**CODE ORGANIZATION** 9. [Decomposition Guidelines (600 LOC Max)](#9-decomposition-guidelines-600-loc-max) 10. [Naming Conventions](#10-naming-conventions) 11. [Import & Export Patterns](#11-import--export-patterns) 12. [Monorepo Organization](#12-monorepo-organization) 13. [Quick Checklist](#13-quick-checklist)

---

## 1. Project Vision

Build a dual-purpose system that serves as both the **Vibey website** AND a **landing page creation automation engine**. We're creating the infrastructure to generate infinite landing pages automatically while building our own brand presence.

---

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
  - Video -> Transcription -> Landing Page in under 10 minutes
  - Zero manual coding required for new page creation
  - Automatic deployment and URL generation

---

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

## 4. File Organization & Directory Structure

### **Services** (`/src/lib/services/`)

- External API integrations (Firecrawl, OpenRouter, etc.)
- Business logic that needs server environment
- **RULE:** If it uses `process.env`, it's server-side only
- Shared services used by multiple features

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

### **Features** (`/src/features/`)

- Smart components with business logic
- Can call API routes (not services directly)
- Handle state management and data fetching
- Each feature is self-contained

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

## 5. Component Organization & Categorization

### **Standard Component Categories**

| Category       | Purpose                    | Naming Convention               | When to Use                              |
| -------------- | -------------------------- | ------------------------------- | ---------------------------------------- |
| **`dialogs/`** | Modal/popup components     | `[Action][Feature]Dialog.tsx`   | Confirmation dialogs, create/edit modals |
| **`wizard/`**  | Multi-step form components | `[Feature]WizardStep[Name].tsx` | Onboarding flows, creation wizards       |
| **`hub/`**     | Dashboard/overview views   | `[Feature]Hub.tsx`              | Main feature dashboards                  |
| **`list/`**    | List/table view components | `[Feature]List.tsx`             | Data tables, grid views                  |
| **`detail/`**  | Single item detail views   | `[Feature]Detail[Element].tsx`  | Detail pages, preview components         |
| **`editor/`**  | Editor/builder components  | `[Feature]Editor[Element].tsx`  | Visual editors, WYSIWYG builders         |
| **`common/`**  | Shared within feature      | `[Element].tsx`                 | Reusable components within feature only  |
| **`forms/`**   | Form-related components    | `[Feature]Form[Element].tsx`    | Form fields, input groups                |
| **`cards/`**   | Card components            | `[Feature]Card.tsx`             | Grid cards, list cards                   |

### **Category Decision Tree**

```
Is it a component for this feature?
├─ YES
│  ├─ Is it a modal/popup? -> dialogs/
│  ├─ Is it a wizard step? -> wizard/
│  ├─ Is it the main dashboard? -> hub/
│  ├─ Is it for listing multiple items? -> list/
│  ├─ Is it for showing single item details? -> detail/
│  ├─ Is it an editor/builder? -> editor/
│  ├─ Is it used across multiple categories? -> common/
│  └─ Is it a form component? -> forms/
└─ NO (used by multiple features)
   └─ Move to /src/components/
```

---

## 6. Feature Structure Standards

### **Feature Isolation Rules**

1. **Features NEVER import from other features**
   - Extract to shared components if needed by multiple features

2. **Features CAN import from:**
   - Shared components (`@/components`)
   - Shared lib (`@/lib`)
   - Their own internal modules

3. **API routes organized by feature**
   - Working on Offers -> ONLY touch `/api/offers/*`
   - Never modify other features' API routes

### **Container Pattern (for Wizards/Complex Flows)**

**Container responsibilities:**

- Step routing (currentStep, next/back)
- Validation gates
- Branching logic
- Data fetching/mutations
- Side effects and external service calls
- State composition

**Step component responsibilities:**

- UI rendering only
- Minimal view logic
- Receive `value`, `errors`, and callbacks
- No direct API calls
- No business logic

---

## 7. Template Architecture

### **Single Source of Truth: Packages**

All funnel templates live in the monorepo packages, NOT in individual apps.

```
/packages/funnel-templates/src/templates/
   ├── LandingPage/
   │   ├── BasicGray.tsx
   │   └── BasicWhite.tsx
   └── ThankYou/
       ├── BasicGray.tsx
       └── BasicWhite.tsx
```

### **Import Pattern**

```typescript
// Correct - Import from packages
import { LandingTemplate } from '@Vibey/funnel-templates'
// Incorrect - Don't create local templates
import { LandingTemplate } from '../templates/landing/BasicGray'
```

---

## 8. Template Design System

### **Responsive Typography (Mobile First)**

- **Mobile (0-640px)**: Smaller, readable sizes (48px headline)
- **Tablet (640-1024px)**: Medium scaling (80px headline)
- **Desktop (1024px+)**: Full impact (130px headline)

### **Visual Hierarchy (Max-Width)**

- **Headline**: `max-width: 1000px` (widest)
- **Subheadline**: `max-width: 850px` (85% of headline)
- **Body Text**: `max-width: 600px` (optimal reading length)

---

## 9. Decomposition Guidelines (600 LOC Max)

### **File Size Guidelines by Type**

| File Type     | Max LOC | Action at 80%                     |
| ------------- | ------- | --------------------------------- |
| **Container** | 600     | Extract step components or hooks  |
| **Component** | 400     | Split into smaller components     |
| **Hook**      | 300     | Extract sub-hooks or utilities    |
| **Service**   | 600     | Split into multiple services      |
| **API Route** | 400     | Extract business logic to service |
| **Types**     | 500     | Split by domain concept           |
| **Utility**   | 300     | Split by functionality            |

### **When to Split Further**

- **Large forms:** Extract field groups into subcomponents
- **Reused logic:** Extract custom hooks
- **Heavy side effects:** Isolate in services

---

## 10. Naming Conventions

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

---

## 11. Import & Export Patterns

### **Barrel Files (index.ts)**

```typescript
// Import from barrel
import { OfferCard, OfferPriceCard } from '@/features/offers/components'

// Correct - Barrel export
export { OfferCard } from './OfferCard'
export { OfferPriceCard } from './OfferPriceCard'
```

### **Import Order Convention**

```typescript
// 1. External dependencies
import { useEffect, useState } from 'react'
// 2. Internal absolute imports (@/)
import { useOfferWizardState } from '@/features/offers/hooks'
// 3. Relative imports
import { OfferPriceCard } from './OfferPriceCard'
// 4. Styles/Assets
import './styles.css'
```

---

## 12. Monorepo Organization

### **Workspace Structure**

```
Vibey_v2/
├── apps/
│   ├── app/                    # Main application (Next.js)
│   ├── site/                   # Marketing site (Next.js)
│   ├── community/              # Community platform (Next.js)
│   └── app-backend/            # NestJS backend
├── packages/
│   ├── funnel-templates/       # Shared funnel templates
│   ├── ui/                     # Shared UI components (future)
│   └── utils/                  # Shared utilities (future)
├── .docs/                      # Documentation
└── package.json                # Root workspace config
```

---

## 13. Quick Checklist

### **Before Creating a New Feature**

- [ ] Does it need external API calls? -> Create service + API route
- [ ] Does it need authentication? -> Add auth check in API route
- [ ] Does it modify data? -> Use server-side Supabase client
- [ ] Is it reusable UI? -> Put in `/components/`
- [ ] Is it business logic? -> Put in `/features/`
- [ ] File size will stay under 600 LOC? -> Plan decomposition if needed

### **Component Organization Checklist**

- [ ] Components organized by category (dialogs, wizard, hub, list, detail, editor, common)
- [ ] Only created category folder when 2+ components exist
- [ ] Followed naming convention for component category
- [ ] Cross-feature components moved to `/src/components/`

### **Feature Isolation Checklist**

- [ ] Feature doesn't import from other features
- [ ] API routes organized by feature
- [ ] Shared code extracted to `/lib` or `/components`
- [ ] Feature has its own types/hooks/services folders
