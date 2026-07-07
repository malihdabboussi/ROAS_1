# 100% Sure Protocol

## ⚠️ CONTEXT FIRST (MANDATORY)

**Before analyzing ANYTHING:**

1. **Read ENTIRE files (100% of lines)**
   - NEVER read 100 lines of a 600-line file
   - NEVER read "relevant sections" only
   - File is 1000 lines? Read ALL 1000
   - NO EXCEPTIONS

2. **Read ALL related files**
   - Files that import this file (grep to find)
   - Files this file imports (check imports)
   - Parent components
   - Child components
   - API routes
   - Services used

3. **Understand complete data flow**
   - Where data comes from
   - How it's transformed (every step)
   - Where it goes
   - Who uses it

**Context Checklist - ALL must be checked:**

- [ ] Read ENTIRE target file (100% of lines)
- [ ] Read ALL importing files
- [ ] Read ALL imported files
- [ ] Understand complete data flow
- [ ] Found all usages (grep)
- [ ] Checked git history
- [ ] Know how change fits in system

**If ANY box unchecked → STOP. DO NOT EDIT.**

---

## ⚠️ CROSS-FEATURE IMPACT ANALYSIS (MANDATORY)

**Before implementing ANY code change, verify it won't affect other processes.**

### Impact Analysis Protocol

1. **Identify all features/processes that touch this code**
   - Grep for all imports of modified file
   - Grep for all function/component usages
   - Check database queries that read/write same tables
   - Identify shared state/context dependencies
   - Find API routes that use same services

2. **Trace side effects**
   - What other features use this function/component?
   - What happens if return value changes?
   - What happens if timing changes?
   - What if error handling changes?
   - What shared resources are affected? (DB, cache, state)

3. **Confidence calculation**

   ```
   For EACH dependent feature/process:
   - Read its implementation (100% of files)
   - Verify your change won't break it
   - Test critical paths mentally
   - Document why it's safe

   Confidence = (Safe features / Total features) × 100
   ```

### 95% Confidence Threshold

**You MUST reach 95% confidence that:**

- Feature operations will continue working
- No dependent features will break
- No side effects will cause issues
- Performance won't degrade significantly
- Data integrity is maintained

**Impact Checklist - ALL must be checked:**

- [ ] Grepped all usages of modified code
- [ ] Listed all dependent features/processes
- [ ] Read implementation of each dependent
- [ ] Verified change won't break each one
- [ ] Checked shared resource access (DB, state, cache)
- [ ] Verified no timing/race conditions introduced
- [ ] Confirmed error handling remains intact
- [ ] Assessed performance impact
- [ ] Confidence ≥95%

**If confidence <95% → STOP and report:**

```
PROPOSED CHANGE: [what you want to change]

DEPENDENT FEATURES:
1. [Feature A] - [how it uses this code]
2. [Feature B] - [how it uses this code]
...

CONFIDENCE: [X]%

CONCERNS:
- [Specific concern about Feature A]
- [Specific concern about Feature B]

RECOMMENDATION: [Ask user OR gather more context]
```

### Example Impact Analysis

```
CHANGE: Modifying useWizardState hook to add new field

DEPENDENT FEATURES:
1. Funnel Wizard (FunnelCopilotWizardContainer.tsx)
   - Uses: All state fields
   - Impact: None (additive change)
   - Confidence: 100%

2. Offer Creation (OfferWizardContainer.tsx)
   - Uses: Subset of state fields
   - Impact: None (doesn't use new field)
   - Confidence: 100%

3. Branding Setup (BrandingWizard.tsx)
   - Uses: Different state entirely
   - Impact: None (separate hook instance)
   - Confidence: 100%

SHARED RESOURCES:
- Database: No schema changes
- API: No route changes
- State: Additive only, no removals

OVERALL CONFIDENCE: 100%
SAFE TO PROCEED: YES
```

---

## ⚠️ DEAD CODE REMOVAL (MANDATORY)

**After creating NEW code, remove OLD code it replaces.**

### Quick Protocol

1. **Created new code?** → What does it replace?
2. **Find old code** → Use grep to find all usages
3. **Confidence check:**
   - **≥90%** safe to remove → Remove it
   - **<90%** → ASK USER before removing

### Removal Checklist

- [ ] New code replaces something old?
- [ ] Grepped for old code usages?
- [ ] ≥90% confident OR asked user?
- [ ] Removed old files in same change?
- [ ] Removed from barrel exports (index.ts)?

**Template for asking user (when <90% confident):**

```
I created [new code].

OLD CODE: [file/path]
USAGES: [locations found]
CONFIDENCE: [X]%
CONCERN: [why uncertain]

Should I remove the old code?
```

**If ANY unchecked → STOP. Complete cleanup.**

---

## Pre-Edit Verification

Before editing ANY line of code, verify:

1. **Read the actual file** (ENTIRELY, not from memory)
2. **Quote the exact line** you're changing
3. **Verify no dependencies** break
4. **State why this specific LOC** needs changing
5. **Verified complete context** (checklist above)
6. **Completed impact analysis** (≥95% confidence)

## Execution Rules

- Context gathering is MANDATORY (see above)
- Impact analysis is MANDATORY (≥95% confidence)
- Pay extra attention while editing
- Do not modify anything beyond what's required
- Make edits in very small, focused steps
- ONLY change a LOC once you are 100% certain it's the correct one
- NEVER make quick fixes without full context

## Evidence Format

Before each edit:

```
File: [exact path]
Current line [X]: [exact current code]
Changing to: [exact new code]
Reason: [specific reason]
Dependencies checked: [list]
Impact analysis: ≥95% confidence
Confidence: 100%
```

## Failure Mode

If you can't provide evidence above → STOP and ask questions.
