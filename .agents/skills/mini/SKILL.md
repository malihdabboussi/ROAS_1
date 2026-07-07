# /mini - Initialize MiniMe Task Workspace

**Purpose:** Create a structured task workspace for MiniMe parallel agent execution with PRD + progress tracking.

## When Invoked

When the user runs `/mini [task-name]`, you MUST:

### Step 1: Parse Task Name

Extract the task name from the command. If no name provided, ask:
"What's the name for this task? (e.g., 'lead-magnet-viewer', 'fix-auth-flow')"

### Step 2: Create Task Folder

Create folder: `apps/minime/.docs/.tasks/[task-name]/`

### Step 3: Create prd.json

Create `apps/minime/.docs/.tasks/[task-name]/prd.json` with this template:

```json
{
  "project": "[Task Name - Human Readable]",
  "branchName": "current",
  "description": "[Ask user to describe the task in 1-2 sentences]",
  "recommendedAgents": 3,
  "context": {
    "currentProblem": "[What problem are we solving?]",
    "desiredState": "[What should the end result look like?]",
    "architectureGoal": "[Optional: Any architectural considerations]"
  },
  "userStories": [
    {
      "id": "US-001",
      "title": "[First story title]",
      "description": "[What this story accomplishes]",
      "acceptanceCriteria": [
        "[Criterion 1]",
        "[Criterion 2]",
        "TypeScript compiles without errors"
      ],
      "priority": 1,
      "passes": false,
      "dependsOn": [],
      "notes": ""
    }
  ]
}
```

### Step 4: Create progress.txt

Create `apps/minime/.docs/.tasks/[task-name]/progress.txt` with this template:

```
## Codebase Patterns
(Patterns discovered during this task will be added here)

---
```

### Step 5: Confirm & Guide

After creating files, respond with:

```
Task workspace created: apps/minime/.docs/.tasks/[task-name]/

Files:
- prd.json (PRD with user stories)
- progress.txt (Progress log)

How to work on this task:
1. Fill in the prd.json with your user stories
2. Define dependencies between stories using dependsOn
3. Start the task:
   - Sequential: POST /tasks/[task-name]/start
   - Parallel: POST /tasks/[task-name]/start-parallel?maxConcurrent=3

Your workspace: apps/minime/.docs/.tasks/[task-name]/

Would you like me to help you define the user stories for this task?
```

---

## PRD User Story Template

When helping define stories, use this format:

```json
{
  "id": "US-XXX",
  "title": "[Action verb] [What]",
  "description": "As a [role], I need [capability] so that [benefit].",
  "acceptanceCriteria": [
    "[Specific, testable criterion]",
    "[Another criterion]",
    "TypeScript compiles without errors"
  ],
  "priority": [1-5, lower = higher priority],
  "passes": false,
  "dependsOn": ["US-YYY"],
  "notes": "[Optional context]",
  "visualVerification": {
    "url": "http://localhost:3000/path/to/page",
    "requiresLogin": false,
    "selector": ".specific-component",
    "lookFor": "Description of what reviewer should verify visually"
  }
}
```

---

## Visual Verification (visualVerification)

The `visualVerification` field enables **automated screenshot verification** using browserless.io. When present, MiniMe will:

1. Connect to a cloud browser
2. Optionally log in to the app
3. Navigate to the specified URL
4. Take a screenshot (full page or specific element)
5. Include the screenshot in the reviewer's context

**Fields:**

| Field           | Type    | Required | Description                                                      |
| --------------- | ------- | -------- | ---------------------------------------------------------------- |
| `url`           | string  | Yes      | URL to navigate to for verification                              |
| `requiresLogin` | boolean | No       | If true, logs in using VIBEY_TEST_EMAIL/PASSWORD env vars        |
| `selector`      | string  | No       | CSS selector to screenshot (defaults to full page if omitted)    |
| `lookFor`       | string  | No       | Description of what the reviewer should verify in the screenshot |

**When to use visual verification:**

- UI component stories (buttons, forms, layouts)
- Styling/theme changes
- Responsive design verification
- Any story with "Verify in browser" acceptance criteria

**When NOT to use:**

- API-only changes
- Backend logic
- Database migrations
- Stories that don't affect UI

**Example - Full page screenshot:**

```json
"visualVerification": {
  "url": "http://localhost:3000/dashboard",
  "requiresLogin": true,
  "lookFor": "Dashboard should show the new metrics widget in the top-right corner"
}
```

**Example - Specific component screenshot:**

```json
"visualVerification": {
  "url": "http://localhost:3000/settings",
  "requiresLogin": true,
  "selector": "[data-testid='theme-selector']",
  "lookFor": "Theme selector should show 5 color options with proper styling"
}
```

**Required environment variables (in apps/minime/.env):**

```env
BROWSERLESS_API_TOKEN=your_token_here
VIBEY_TEST_EMAIL=test@example.com      # Only if requiresLogin: true
VIBEY_TEST_PASSWORD=your_password      # Only if requiresLogin: true
VIBEY_APP_URL=http://localhost:3000    # Optional, defaults to localhost:3000
```

---

## Recommended Agents (recommendedAgents)

The `recommendedAgents` field tells the MiniMe dashboard how many concurrent agents are optimal for this task.

**Guidelines for setting recommendedAgents:**

- **1-2 agents:** Sequential tasks or tasks with heavy file conflicts
- **3 agents (default):** Most tasks with some parallelizable stories
- **4-6 agents:** Tasks with many independent stories that don't share files
- **7-10 agents:** Large tasks with highly independent components

**Factors to consider:**

- Number of stories that can run in parallel (based on dependsOn)
- Whether stories modify the same files (lower count to avoid conflicts)
- Complexity of each story (more complex = fewer agents)
- Available system resources

The dashboard will pre-select this value but users can override it before starting.

---

## Story Dependencies (dependsOn)

The `dependsOn` field enables **parallel execution** of stories by the MiniMe orchestrator.

**How it works:**

- `dependsOn: []` - Story can run immediately (no dependencies)
- `dependsOn: ["US-001"]` - Story waits until US-001 passes
- `dependsOn: ["US-001", "US-002"]` - Story waits until BOTH pass

**Parallel Execution:**
When running with `/tasks/:id/start-parallel`, stories without dependencies (or with all deps passed) run concurrently up to `maxConcurrent` agents.

**Example Dependency Graph:**

```
US-001 (no deps) ----+---> US-002 (depends on US-001) ---+---> US-004 (depends on US-002, US-003)
                     |                                    |
US-003 (no deps) ----+------------------------------------+

Execution: US-001 + US-003 run in parallel
           -> US-002 starts after US-001 passes
           -> US-004 starts after US-002 AND US-003 pass
```

**Guidelines:**

- Independent stories (no shared code) should have `dependsOn: []`
- Stories building on previous work should list their dependencies
- Foundation/setup stories should always be `dependsOn: []`
- UI stories often depend on API/data stories

---

## Acceptance Criteria Guidelines

Good acceptance criteria are:

- **Specific:** "Add email field to form" not "Update form"
- **Testable:** "Returns 200 status" not "Works correctly"
- **Complete:** Include edge cases
- **Always include:** "TypeScript compiles without errors"
- **For UI:** Include "Verify in browser" criterion

---

## Example PRD with Dependencies

```json
{
  "project": "Lead Magnet Public Viewer",
  "branchName": "current",
  "description": "Create public viewer page for lead magnets with theme support",
  "recommendedAgents": 2,
  "context": {
    "currentProblem": "Lead magnets can only be viewed in the editor",
    "desiredState": "Public URL renders lead magnet slides with applied theme"
  },
  "userStories": [
    {
      "id": "US-001",
      "title": "Create public viewer route",
      "description": "As a visitor, I need a public URL to view lead magnets.",
      "acceptanceCriteria": [
        "Route /view/[id] renders lead magnet",
        "No auth required for public view",
        "404 page if lead magnet not found",
        "TypeScript compiles without errors"
      ],
      "priority": 1,
      "passes": false,
      "dependsOn": [],
      "notes": "Check existing funnel viewer pattern"
    },
    {
      "id": "US-002",
      "title": "Render slides with theme",
      "description": "As a visitor, I see slides styled with the lead magnet's theme.",
      "acceptanceCriteria": [
        "Slides render with correct colors from theme",
        "Typography matches theme settings",
        "Background uses theme colors",
        "TypeScript compiles without errors"
      ],
      "priority": 2,
      "passes": false,
      "dependsOn": ["US-001"],
      "notes": "Depends on route being created first",
      "visualVerification": {
        "url": "http://localhost:3000/view/test-lead-magnet-id",
        "requiresLogin": false,
        "lookFor": "Slides should display with themed colors, correct typography, and proper background"
      }
    },
    {
      "id": "US-003",
      "title": "Add slide navigation",
      "description": "As a visitor, I can navigate between slides.",
      "acceptanceCriteria": [
        "Next/prev buttons work",
        "Keyboard arrows work",
        "Progress indicator shows current slide"
      ],
      "priority": 2,
      "passes": false,
      "dependsOn": ["US-001"],
      "notes": "Can run in parallel with US-002",
      "visualVerification": {
        "url": "http://localhost:3000/view/test-lead-magnet-id",
        "requiresLogin": false,
        "selector": ".slide-navigation",
        "lookFor": "Navigation buttons should be visible with prev/next arrows and progress indicator"
      }
    },
    {
      "id": "US-004",
      "title": "Add analytics tracking",
      "description": "As an owner, I see view analytics for my lead magnet.",
      "acceptanceCriteria": [
        "View count increments on page load",
        "Time spent tracked",
        "Slide-by-slide engagement recorded"
      ],
      "priority": 3,
      "passes": false,
      "dependsOn": ["US-002", "US-003"],
      "notes": "Requires both viewer and navigation complete - no visual verification needed (backend only)"
    }
  ]
}
```

**This PRD executes as:**

1. US-001 runs first (foundation)
2. US-002 + US-003 run in parallel (both depend only on US-001)
3. US-004 runs last (depends on both US-002 and US-003)

---

## MiniMe API Reference

**Start Task (Sequential):**

```bash
POST http://localhost:3004/tasks/[task-name]/start
```

**Start Task (Parallel):**

```bash
POST http://localhost:3004/tasks/[task-name]/start-parallel?maxConcurrent=3
```

**Control Task:**

```bash
POST http://localhost:3004/tasks/[task-name]/pause
POST http://localhost:3004/tasks/[task-name]/resume
POST http://localhost:3004/tasks/[task-name]/stop
```

**Get Task Status:**

```bash
GET http://localhost:3004/tasks/[task-name]
```

**Analyze Task (Blind Spot Detection):**

```bash
POST http://localhost:3004/tasks/[task-name]/analyze
```

**Get Blind Spots:**

```bash
GET http://localhost:3004/tasks/[task-name]/blind-spots
```

**Resolve Blind Spot:**

```bash
PATCH http://localhost:3004/tasks/[task-name]/blind-spots/[bs-id]
Body: { "resolved": true, "resolution": "Added to acceptance criteria" }
```

---

## Blind Spot Analysis

The MiniMe system includes a **Blind Spot Detector Agent** that analyzes your PRD before implementation starts. It identifies ambiguous requirements where implementer agents might have to guess.

### What is a Blind Spot?

A blind spot is any requirement gap where:

- An implementer would have to GUESS what to do
- The behavior is not explicitly defined
- Edge cases are not covered
- UX states are missing (loading, error, empty)
- Code patterns are unspecified (which service? which hook?)
- Integration details are vague
- Error handling is undefined

### Blind Spot Structure

```json
{
  "id": "BS-001",
  "storyId": "US-002",
  "category": "ux",
  "severity": "high",
  "question": "What happens when the API returns an error?",
  "suggestion": "Specify error message text, display location, and retry behavior",
  "resolved": false,
  "resolution": null
}
```

### Categories

| Category         | Description                                    |
| ---------------- | ---------------------------------------------- |
| `ux`             | Missing UX states, transitions, user feedback  |
| `code`           | Unspecified code patterns, services, hooks     |
| `data`           | Unknown data shapes, validation, null handling |
| `integration`    | Vague API contracts, external dependencies     |
| `error-handling` | Undefined error scenarios and recovery         |

### Severity Levels

| Severity | Meaning                                       | Advisory      |
| -------- | --------------------------------------------- | ------------- |
| `high`   | Implementer WILL likely make wrong assumption | Warning shown |
| `medium` | Implementer MIGHT make inconsistent choice    | Informational |
| `low`    | Minor ambiguity, unlikely to cause issues     | Informational |

**Note:** Blind spots are advisory only. You can start implementation at any time.

### Workflow

1. **Create PRD** with user stories
2. **Click "Analyze"** in the dashboard
3. **Review blind spots** in the Analysis tab
4. **Resolve each blind spot** by either:
   - Adding detail to acceptance criteria
   - Adding to PRD decisions section
   - Documenting the answer in the resolution field
5. **Start implementation** once all high-severity blind spots are resolved

### Advisory Warning

If there are unresolved high-severity blind spots, a warning is shown but **you can still start anytime**. The analysis is meant to help you catch ambiguities, not block your workflow.

### Example Blind Spots

**UX Blind Spot:**

```json
{
  "id": "BS-001",
  "storyId": "US-003",
  "category": "ux",
  "severity": "high",
  "question": "Acceptance criteria says 'show success message' but doesn't specify: Toast or inline? Duration? Dismissible?",
  "suggestion": "Add: 'Show toast notification for 3 seconds with success message'"
}
```

**Code Blind Spot:**

```json
{
  "id": "BS-002",
  "storyId": "US-005",
  "category": "code",
  "severity": "medium",
  "question": "Which existing service should handle the data fetching? ApiService or dedicated service?",
  "suggestion": "Specify in notes which service pattern to follow"
}
```

---

## Methodology Reminder

When working on a task:

1. **Create PRD** - Define user stories with clear acceptance criteria
2. **Run analysis** - Click "Analyze" to detect blind spots
3. **Resolve blind spots** - Fix all high-severity issues before starting
4. **Define dependencies** - Plan which stories can run in parallel
5. **Start task** - Begin implementation with agents

When agents work on stories:

1. **ONE story at a time** - Complete before moving to next (in sequential mode)
2. **Read context first** - Check progress.txt Codebase Patterns section
3. **Follow guidelines** - Read relevant guideline sections
4. **Quality gates** - TypeScript must pass before marking complete
5. **Log learnings** - Update progress.txt with discoveries
6. **Mark complete** - Set `passes: true` when story is done
