---
name: architecture-follow
description: A protocol that should be used when editing code to understand the project and backend architecture before making changes.
---

## CRITICAL: Architecture Context First

**BEFORE making ANY plan or implementation:**

1. Read `.docs/guidelines/architecture/project-architecture.md` **ENTIRELY** (read ALL of it)
2. Read `.docs/guidelines/architecture/backend-architecture.md` **ENTIRELY** (read ALL of it)
3. Read **ENTIRE target files** you'll modify (not excerpts)
4. Read **ALL files** that import or are imported by target files

**Context Checklist - MUST verify ALL:**

- [ ] Read ENTIRE project-architecture.md (architecture folder)
- [ ] Read ENTIRE backend-architecture.md (architecture folder)
- [ ] Read ENTIRE target file (100% of lines)
- [ ] Read ALL importing files
- [ ] Read ALL imported files
- [ ] Understand complete data flow

**If ANY box unchecked -> STOP. Gather context first.**

---

## Architecture Compliance

Please make sure that your plan/implementation follows:

- `.docs/guidelines/architecture/project-architecture.md` (project structure, organization, component patterns)
- `.docs/guidelines/architecture/backend-architecture.md` (NestJS patterns, three-layer architecture, services)

All files are in:
`.docs/guidelines/architecture/` folder.

**Key Rules:**

- READ ENTIRE FILES (not excerpts)
- NEVER make assumptions without context
- NEVER quick fix without understanding root cause
- ALWAYS read related files
- FOLLOW three-layer separation (Controllers -> Services -> Repositories)
- MAINTAIN service isolation (vertical slices, not horizontal layers)
- RESPECT file size limits (Controllers: 200 LOC, Services: 600 LOC, Repositories: 400 LOC)
