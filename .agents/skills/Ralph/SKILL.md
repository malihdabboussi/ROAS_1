# /ralph - Initialize Structured Task Workspace

**Purpose:** Create a structured task workspace for Cursor agent using Ralph's methodology (PRD + progress tracking).

## When Invoked

When the user runs `/ralph [task-name]`, you MUST:

### Step 1: Parse Task Name

Extract the task name from the command. If no name provided, ask:
"What's the name for this task? (e.g., 'lead-magnet-viewer', 'fix-auth-flow')"

### Step 2: Create Task Folder

Create folder: `.docs/.tasks/[task-name]/`

### Step 3: Create prd.json

Create `.docs/.tasks/[task-name]/prd.json` with this template:

```json
{
  "project": "[Task Name - Human Readable]",
  "branchName": "current",
  "description": "[Ask user to describe the task in 1-2 sentences]",
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
      "notes": ""
    }
  ]
}
```

### Step 4: Create progress.txt

Create `.docs/.tasks/[task-name]/progress.txt` with this template:

```
## Codebase Patterns
(Patterns discovered during this task will be added here)

---
```

### Step 5: Confirm & Guide

After creating files, respond with:

```
✅ Task workspace created: .docs/.tasks/[task-name]/

📁 Files:
- prd.json (PRD with user stories)
- progress.txt (Progress log)

🚀 How to work on this task:
1. Fill in the prd.json with your user stories
2. Work through stories systematically:
   - Pick highest priority story where passes: false
   - Implement that single story
   - Run quality checks (typecheck, lint)
   - Mark passes: true when complete
   - Log progress in progress.txt

📍 Your workspace: .docs/.tasks/[task-name]/

Would you like me to help you define the user stories for this task?
```

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
  "notes": "[Optional context]"
}
```

## Acceptance Criteria Guidelines

Good acceptance criteria are:

- **Specific:** "Add email field to form" not "Update form"
- **Testable:** "Returns 200 status" not "Works correctly"
- **Complete:** Include edge cases
- **Always include:** "TypeScript compiles without errors"
- **For UI:** Include "Verify in browser" criterion

## Example PRD

```json
{
  "project": "Lead Magnet Public Viewer",
  "branchName": "current",
  "description": "Create public viewer page for lead magnets with theme support",
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
        "TypeScript compiles without errors",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 2,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Methodology Reminder

When working on stories:

1. **ONE story at a time** - Complete before moving to next
2. **Read context first** - Check progress.txt Codebase Patterns section
3. **Follow guidelines** - Read relevant guideline sections (use TOC)
4. **Quality gates** - TypeScript must pass before marking complete
5. **Log learnings** - Update progress.txt with discoveries
6. **Mark complete** - Set `passes: true` when story is done

**Note:** This workspace is for Cursor agent. Ralph CLI has its own separate workspace at `ralph/plans/`.
