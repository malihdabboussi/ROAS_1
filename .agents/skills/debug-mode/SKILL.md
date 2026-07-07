# Debug Mode Skill

An advanced hypothesis-driven debugging system inspired by scientific debugging methods.

## Trigger

**Start**: `/debug-mode` + bug description
**End**: "done debugging", "debug cleanup", "end debug", or "mark fixed"

## Automation

### On Start (Codex MUST do automatically):

1. Start debug server: `npx tsx .Codex/skills/debug-mode/debug-server.ts`
2. Analyze the problem (read ENTIRE files)
3. Generate ranked hypotheses
4. Inject strategic logs
5. Tell user to reproduce

### On End (Codex MUST do automatically):

1. Remove ALL debug-log regions
2. Kill debug server
3. Delete debug.log
4. Confirm cleanup

---

## Phase 1: Problem Analysis

### 1.1 Gather Context (BEFORE any hypothesis)

- Read ENTIRE file(s) involved (100% of lines)
- Read related files (imports, consumers)
- Check git history: `git log --oneline -10 -- [file]`
- Search for similar patterns: `grep -rn "similar_function" .`

### 1.2 Classify Bug Type

Identify which category to tailor the approach:

| Bug Type        | Key Indicators          | Focus Area                 |
| --------------- | ----------------------- | -------------------------- |
| **Data Flow**   | Wrong/missing data      | Track transformations      |
| **State**       | UI not updating         | State changes, renders     |
| **Timing/Race** | Intermittent, async     | Timestamps, sequence       |
| **API**         | Network failures        | Request/response           |
| **Logic**       | Wrong behavior          | Branch conditions          |
| **Memory/Leak** | Performance degradation | Allocations, refs          |
| **Event**       | Handler not firing      | Event binding, propagation |

---

## Phase 2: Hypothesis Generation

### 2.1 Generate Multiple Hypotheses (MANDATORY before logging)

Create 3-5 ranked hypotheses using the "5 Whys" technique:

```markdown
## Debug Session: [Bug Title]

### Bug Description

[Exact symptom and reproduction steps]

### Hypotheses (ranked by likelihood)

**H1** (70% likely): [Most probable cause]

- Evidence for: [what supports this]
- Evidence against: [what contradicts]
- Test: [how to prove/disprove]

**H2** (20% likely): [Second possibility]

- Evidence for: ...
- Evidence against: ...
- Test: ...

**H3** (10% likely): [Edge case / less obvious]

- Evidence for: ...
- Evidence against: ...
- Test: ...
```

### 2.2 Hypothesis Quality Checklist

Each hypothesis MUST be:

- [ ] Specific (not "something is wrong")
- [ ] Testable (can be proven/disproven with logs)
- [ ] Actionable (points to specific code location)
- [ ] Falsifiable (logs will definitively confirm or eliminate)

---

## Phase 3: Strategic Instrumentation

### 3.1 Log Placement Strategy

**Follow the data flow - log at each transformation:**

```
Source → [LOG] → Transform1 → [LOG] → Transform2 → [LOG] → Destination
```

**For each hypothesis, add logs that will PROVE or DISPROVE it:**

| Hypothesis Type      | Where to Log                   | What to Capture            |
| -------------------- | ------------------------------ | -------------------------- |
| Data not arriving    | Function entry                 | Input params, caller       |
| Wrong transformation | Before/after transform         | Input → Output             |
| State not updating   | Before setState, in useEffect  | Old state, new state, deps |
| Timing issue         | Start/end of async ops         | Timestamps, sequence ID    |
| API failure          | Request send, response receive | URL, payload, status, body |
| Event not firing     | Handler entry, binding point   | Event object, target       |
| Condition wrong      | At each branch                 | Condition values           |

### 3.2 Enhanced Log Patterns

**Pattern A: Rich Context Log (Frontend)**

```typescript
// #region debug-log - H1: [hypothesis]
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H1',
    location: 'ComponentName.tsx:functionName:42',
    message: 'Descriptive message',
    data: {
      input: relevantInput,
      state: currentState,
      props: relevantProps,
    },
    stack: new Error().stack?.split('\n').slice(1, 4),
    timestamp: Date.now(),
    sequence: (window.__debugSeq = (window.__debugSeq || 0) + 1),
  }),
}).catch(() => {})
// #endregion
```

**Pattern B: State Diff Log (for state bugs)**

```typescript
// #region debug-log - H2: [state hypothesis]
const __prevState = JSON.stringify(state)
// ... state change happens ...
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H2',
    location: 'Component.tsx:useEffect',
    message: 'State change',
    data: {
      before: JSON.parse(__prevState),
      after: state,
      trigger: 'useEffect dependency change',
    },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion
```

**Pattern C: Timing Log (for race conditions)**

```typescript
// #region debug-log - H3: [timing hypothesis]
const __opId = Math.random().toString(36).slice(2, 8)
const __startTime = performance.now()
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H3',
    location: 'service.ts:asyncOperation:START',
    message: 'Async operation started',
    data: { operationId: __opId, startTime: __startTime },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// ... async operation ...
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H3',
    location: 'service.ts:asyncOperation:END',
    message: 'Async operation completed',
    data: {
      operationId: __opId,
      duration: performance.now() - __startTime,
      result: 'success/error',
    },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion
```

**Pattern D: API Debug Log**

```typescript
// #region debug-log - H4: [api hypothesis]
const __reqBody = { ...requestBody }
const __reqUrl = url
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H4',
    location: 'api.ts:fetchData:REQUEST',
    message: 'API Request',
    data: { url: __reqUrl, method: 'POST', body: __reqBody },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// ... after response ...
fetch('http://127.0.0.1:7242/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hypothesis: 'H4',
    location: 'api.ts:fetchData:RESPONSE',
    message: 'API Response',
    data: { status: response.status, body: responseData, ok: response.ok },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion
```

**Pattern E: Backend/Node Log**

```typescript
// #region debug-log - H5: [backend hypothesis]
console.log(
  '[DEBUG-H5]',
  JSON.stringify(
    {
      location: 'service.ts:method:42',
      message: 'Description',
      data: { relevant: 'data' },
      timestamp: Date.now(),
      requestId: req?.id || 'unknown',
    },
    null,
    2,
  ),
)
// #endregion
```

---

## Phase 4: Analysis Loop

### 4.1 First Log Analysis

After user reproduces bug:

```markdown
## Log Analysis - Round 1

### Hypothesis Status Update

- **H1**: [CONFIRMED/ELIMINATED/NEEDS MORE DATA] - [evidence from logs]
- **H2**: [CONFIRMED/ELIMINATED/NEEDS MORE DATA] - [evidence from logs]
- **H3**: [CONFIRMED/ELIMINATED/NEEDS MORE DATA] - [evidence from logs]

### Key Findings

1. [What the logs revealed]
2. [Unexpected behavior discovered]
3. [Data flow observation]

### Next Steps

- [ ] [If CONFIRMED: Proceed to fix]
- [ ] [If NEEDS MORE DATA: Add more targeted logs]
- [ ] [If ALL ELIMINATED: Generate new hypotheses]
```

### 4.2 Iterative Refinement

If first round doesn't find root cause:

1. Eliminate disproven hypotheses
2. Generate new hypotheses based on findings
3. Add more targeted logs
4. Repeat until root cause found

### 4.3 Root Cause Confirmation

Before fixing, verify:

- [ ] Root cause explains ALL symptoms
- [ ] Root cause is at the SOURCE (not a symptom)
- [ ] Fix will prevent the entire CLASS of bugs
- [ ] No other code paths have the same issue

---

## Phase 5: Fix & Verify

### 5.1 Fix Classification

Before implementing, classify the fix:

**Right Fix (CHOOSE):**

- Fixes root cause, not symptom
- Prevents similar bugs
- Reduces code complexity
- Matches architecture patterns

**Wrong Fix (AVOID):**

- Adds workaround
- Uses try/catch to hide error
- Adds defensive fallback without fixing source
- Duplicates code

### 5.2 Verification Loop

After implementing fix:

1. Keep debug logs in place
2. Ask user to reproduce original bug
3. Verify logs show correct behavior
4. Only then mark as fixed and cleanup

---

## Phase 6: Advanced Techniques

### 6.1 Git Bisect (for regressions)

If bug appeared recently:

```bash
# Find the commit that introduced the bug
git bisect start
git bisect bad HEAD
git bisect good [last-known-good-commit]
# Test each commit until culprit found
```

### 6.2 Differential Analysis

Compare working vs broken:

```markdown
### Working State (from git history or user report)

- Input: X
- State: Y
- Output: Z

### Broken State

- Input: X'
- State: Y'
- Output: Z' (wrong)

### Delta

- What changed between working and broken?
```

### 6.3 Minimal Reproduction

Help create smallest test case:

1. Remove unrelated code paths
2. Hardcode working values to isolate problem
3. Create standalone reproduction

### 6.4 Similar Pattern Search

After finding bug, search for same pattern elsewhere:

```bash
grep -rn "similar_pattern" --include="*.ts" --include="*.tsx" .
```

Report: "Found X other locations with same pattern. Should we check those too?"

---

## Phase 7: Cleanup & Prevention

### 7.1 Automatic Cleanup

On "done debugging" / "mark fixed":

1. Find all debug regions: `grep -rl "#region debug-log" .`
2. Remove each region using Edit tool
3. Kill debug server
4. Remove debug.log
5. Report: "Cleanup complete. Removed X logs from Y files."

### 7.2 Regression Prevention Suggestion

After fixing, suggest:

```markdown
### Prevent Regression

Consider adding a test:

- Unit test for the specific fix
- Integration test for the user flow
- Edge case tests discovered during debugging
```

---

## Quick Reference

### Commands During Debug Session

| User Says                       | Codex Does                        |
| ------------------------------- | --------------------------------- |
| "more logs"                     | Add more targeted instrumentation |
| "different hypothesis"          | Generate new hypotheses           |
| "check similar"                 | Search for same pattern elsewhere |
| "bisect"                        | Use git bisect to find regression |
| "mark fixed" / "done debugging" | Cleanup and exit                  |

### Log Analysis Checklist

- [ ] Logs appear in expected order?
- [ ] Data values match expectations?
- [ ] All code paths executed?
- [ ] Timing looks correct?
- [ ] Error conditions handled?

### Red Flags in Logs

- Missing log (code path not reached)
- Unexpected null/undefined
- Wrong data type
- Timestamps out of order
- Same operation repeated unexpectedly
- Error swallowed silently

---

## Example Session

````
User: /debug-mode - clicking save doesn't update the list

Codex: [Starts debug server in background]
        [Reads SaveButton.tsx, ListContainer.tsx, api.ts - ENTIRE files]
        [Analyzes data flow]

        ## Debug Session: Save Not Updating List

        ### Hypotheses

        **H1** (60%): API call succeeds but response not used to update state
        - Evidence for: User sees no error, save appears to work
        - Test: Log API response and state update

        **H2** (25%): State updates but component doesn't re-render
        - Evidence for: React state can be stale in closures
        - Test: Log state before/after, check render

        **H3** (15%): API call silently failing
        - Evidence for: Could have network/auth issue
        - Test: Log full request/response

        Added 5 log points. Please click save and tell me what happens.

User: Clicked save, nothing happened visually

Codex: [Analyzes logs]

        ## Log Analysis

        - **H1**: CONFIRMED
          - API returned 200 with new data
          - But setItems() was never called
          - Log shows: response received → [missing log] → no state update

        - **H2**: ELIMINATED (state update never attempted)
        - **H3**: ELIMINATED (API succeeded)

        Root cause: In api.ts:45, the .then() handler returns early
        on success without calling the callback.

        ```typescript
        // Bug: missing callback call
        .then(response => {
          if (response.ok) return response.json(); // Returns here, no callback!
        })
        ```

        Fix: Call onSuccess callback with the data.

        Want me to fix this?

User: Yes, and mark fixed

Codex: [Fixes the bug]
        [Asks user to verify]

User: Works now!

Codex: [Removes all 5 debug-log regions]
        [Kills debug server]
        [Deletes debug.log]

        Fixed: Added onSuccess(data) call in api.ts:47
        Cleanup complete. Removed 5 logs from 3 files.

        ### Regression Prevention
        Consider adding test: "save button should update list after successful API call"
````

---

## Sources & Methodology

This skill is based on:

- [Scientific debugging / Delta debugging](https://en.wikipedia.org/wiki/Delta_debugging)
- [Cursor's Debug Mode](https://cursor.com/blog/debug-mode) - hypothesis-driven, instrumentation-based
- [Spectrum-based fault localization](https://ieeexplore.ieee.org/document/8539194/)
- [AI debugging best practices 2025](https://sparkco.ai/blog/essential-debugging-best-practices-for-2025)
