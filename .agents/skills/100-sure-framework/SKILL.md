---
name: 100-sure
description: A protocol that should be used when editing code to be 100% sure that we follow a specific SOP for context and execution.
---

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

## Execution Rules

- Context gathering is MANDATORY (see above)
- Pay extra attention while editing
- Do not modify anything beyond what's required
- Make edits in very small, focused steps
- ONLY change a LOC once you are 100% certain it's the correct one
- NEVER make quick fixes without full context

## Evidence Format

Before each edit:
File: [exact path]
Current line [X]: [exact current code]
Changing to: [exact new code]
Reason: [specific reason]
Dependencies checked: [list]
Confidence: 100%

## Failure Mode

If you can't provide evidence above → STOP and ask questions.
