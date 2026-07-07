# Viktor AI — Complete Workspace & Architecture Reference

> Generated for Sefy Tofan on March 5, 2026

---

## Table of Contents

1. [Identity & Core Philosophy](#1-identity--core-philosophy)
2. [System Prompt — Core Principles](#2-system-prompt--core-principles)
3. [Workspace Structure](#3-workspace-structure)
4. [Skills System (Memory)](#4-skills-system-memory)
5. [All 21 Skills](#5-all-21-skills)
6. [Tools & Capabilities](#6-tools--capabilities)
7. [Integrations](#7-integrations)
8. [Cron System (Scheduled Tasks)](#8-cron-system-scheduled-tasks)
9. [Slack Integration](#9-slack-integration)
10. [SDK & Code Execution](#10-sdk--code-execution)
11. [How a Conversation Works (Lifecycle)](#11-how-a-conversation-works-lifecycle)
12. [Company & Team Knowledge](#12-company--team-knowledge)

---

## 1. Identity & Core Philosophy

Viktor is an **autonomous AI coworker** that lives in a persistent workspace. Unlike chatbots, Viktor:

- **Works by programming** — writes and runs Python scripts to accomplish tasks
- **Has persistent memory** — stores knowledge in skill files that survive across conversations
- **Runs scheduled tasks** — executes crons (recurring jobs) independently
- **Can only communicate via Slack** — internal thoughts and tool calls are invisible to humans
- **Has a real sandbox** — a Linux workspace with files, directories, and a full Python environment

There is no single "soul file." Viktor's identity emerges from the combination of:

1. **System prompt** (platform-injected instructions)
2. **Skills** (learned knowledge and playbooks)
3. **Company/team files** (context about who it works for)
4. **SDK tools** (what it can actually do)

---

## 2. System Prompt — Core Principles

The system prompt is injected by the Viktor platform into every conversation. It is not a file on disk — it's loaded at runtime. Here are its core directives:

### Core Philosophy

```
"You work by programming. Your sandbox at /work is your workspace where you write
scripts, solve issues, maintain skills, and build reusable workflows."
```

### Three Pillars

1. **Skills are your memory** — SKILL.md files store best practices, processes, and learnings. Always read relevant skills before acting. Always update skills after learning something.
2. **Scripts are your hands** — Write Python scripts to accomplish tasks. One-off scripts for exploration, reusable scripts referenced in skills for repeated work.
3. **Quality is non-negotiable** — Double-check your work. Verify facts. If uncertain, investigate rather than guess.

### Operating Rules

- **Be proactive** — Don't just react to requests. Actively look for ways to help, propose ideas, suggest improvements.
- **Slack is the only voice** — Humans cannot see internal responses, thoughts, or tool calls. Only Slack messages reach humans.
- **Deep investigation required** — 1-2 queries are never enough. Follow each lead thoroughly. Cross-reference multiple sources.
- **Parallelize when possible** — Make independent tool calls simultaneously for speed.
- **Log significant actions** — Write to daily log files.
- **Clean up** — Delete temporary scripts, keep useful ones in skill folders.

### Work Approach

1. Understand deeply first (read skills, check company/team context, grep Slack history)
2. Create `todos.md` to track investigation threads
3. Work by scripting (Python via `uv run`)
4. Quality-check everything before sending
5. Learn and update skills after completing work

### Communication Rules

- Use `*bold*` not `**bold**` (Slack markdown format)
- Keep initial messages short, put details in thread replies
- Never share DM content in channels without permission
- If a task takes time, acknowledge quickly, then follow up with results
- Use code blocks for tables
- Share results via uploaded files (PDFs, Excel, images) when appropriate

---

## 3. Workspace Structure

```
/work/                          ← Root workspace
├── company/
│   └── SKILL.md                ← Company overview (SEFY TOFAN OÜ, industry, revenue)
├── team/
│   └── SKILL.md                ← Team members (Sefy, Dylan — roles, emails, IDs)
├── skills/                     ← 21 skill files (Viktor's memory & playbooks)
│   ├── browser/
│   ├── codebase_engineering/
│   ├── docx_editing/
│   ├── excel_editing/
│   │   └── scripts/validate_excel.py
│   ├── general_tools/
│   ├── integrations/
│   │   ├── SKILL.md
│   │   ├── linkedin/SKILL.md   ← LinkedIn integration (your 5 orgs)
│   │   └── references/
│   ├── pdf_creation/
│   │   └── scripts/extract_site_styles.py
│   ├── pdf_form_filling/
│   ├── pdf_signing/
│   ├── pptx_editing/
│   ├── remotion_video/
│   │   └── references/        ← Animation, 3D, charts docs
│   ├── scheduled_crons/
│   ├── skill_creation/
│   │   └── references/
│   ├── slack_admin/
│   ├── social_media_marketing/
│   ├── thread_orchestration/
│   ├── users/
│   │   ├── u0ajdk0hfdl/       ← Personal notes about Dylan
│   │   ├── u0ajflu99sn/       ← Personal notes about Sefy (private)
│   │   └── u0aju3r45t6/       ← Notes about Viktor itself
│   ├── viktor_account/
│   │   └── references/
│   ├── viktor_spaces_dev/
│   └── workflow_discovery/
│       └── references/example_workflows.md
├── crons/                      ← Scheduled tasks
│   ├── flow_discovery/         ← Workflow discovery (runs Tue & Fri)
│   │   ├── LEARNINGS.md
│   │   ├── discovery.md
│   │   ├── execution.log
│   │   └── scripts/
│   ├── heartbeat/              ← Proactive check-ins (4x daily)
│   │   ├── LEARNINGS.md
│   │   ├── execution.log
│   │   ├── task.json
│   │   └── scripts/
│   │       ├── check_messages.py
│   │       └── check_pending_responses.py
│   └── workflow_discovery/     ← Discovery tracker
│       ├── discovery.md
│       └── task.json
├── sdk/                        ← Viktor's toolkit & API code
│   ├── docs/
│   │   ├── tools.md            ← All available tool functions
│   │   └── available_integrations.json  ← 3,141 connectable integrations
│   ├── tools/                  ← Python modules for each tool category
│   │   ├── default_tools.py    ← Bash, file ops, Slack, threads
│   │   ├── browser_tools.py    ← Web browser automation
│   │   ├── docs_tools.py       ← Library documentation lookup
│   │   ├── email_tools.py      ← Send emails, handle attachments
│   │   ├── pd_linkedin.py      ← LinkedIn API (26 functions)
│   │   ├── scheduled_crons.py  ← Create/manage scheduled tasks
│   │   ├── slack_admin_tools.py← Channel/user management
│   │   ├── thread_orchestration_tools.py ← Parallel task coordination
│   │   ├── utils_tools.py      ← Web search, AI image gen, etc.
│   │   └── viktor_spaces_tools.py ← Deploy web apps
│   ├── utils/
│   │   ├── browser.py          ← Browser session management
│   │   ├── heartbeat_logging.py← Logging utilities
│   │   ├── integrations.py     ← Integration helpers
│   │   ├── slack_reader.py     ← Read synced Slack history
│   │   └── workspace_tree.py   ← Workspace utilities
│   └── internal/
│       └── client.py           ← API client
├── slack_visible/              ← Synced Slack message history (searchable)
├── agent_runs/                 ← Logs of every conversation
│   └── slack/                  ← Per-channel and per-user conversation logs
├── logs/                       ← Daily action logs
│   └── 2026-03-05/global.log
├── downloads/                  ← Downloaded files from Slack/web
├── repos/                      ← Cloned Git repositories
├── temp/                       ← Temporary working files
├── shared/                     ← Shared Python modules
├── viktor-spaces/              ← Deployed web app projects
├── pyproject.toml              ← Python dependencies (35 packages)
└── uv.lock                     ← Dependency lock file
```

---

## 4. Skills System (Memory)

Skills are Viktor's long-term memory. Since Viktor has no memory between conversations, everything important gets written to skill files.

### How Skills Work

```
skills/{skill_name}/
├── SKILL.md           ← Entry point: when to use, key steps, best practices
├── scripts/           ← Referenced scripts for automation
└── references/        ← Detailed docs, examples, edge cases
```

Each SKILL.md has YAML frontmatter with `name` and `description` fields. The description is loaded into the system prompt so Viktor knows which skills are available without reading every file.

### Skill Lifecycle

1. **Before any task:** Read relevant skills to understand best practices
2. **During work:** Follow skill guidance, note what doesn't work
3. **After completion:** Update skills with learnings, especially failures
4. **New capability:** Create a skill so future runs benefit

### What Gets Stored in Skills

- Best practices and workflows
- Integration-specific knowledge (API keys, org IDs, endpoints)
- User preferences and communication styles
- Learnings from mistakes
- Reusable scripts and templates

---

## 5. All 21 Skills

| #   | Skill                      | Description                                                             |
| --- | -------------------------- | ----------------------------------------------------------------------- |
| 1   | **browser**                | Browse websites, fill forms, and scrape web data with a real browser    |
| 2   | **codebase_engineering**   | Clone repos, create branches, make PRs, debug code                      |
| 3   | **docx_editing**           | Edit and modify Word documents (.docx)                                  |
| 4   | **excel_editing**          | Edit and modify Excel spreadsheets (.xlsx)                              |
| 5   | **general_tools**          | Web search, send emails, generate images, convert files to markdown     |
| 6   | **integrations**           | Check, connect, and configure 3rd-party integrations                    |
| 7   | **linkedin**               | LinkedIn API — your 5 orgs, posting, comments, likes, stats, proxy API  |
| 8   | **pdf_creation**           | Create PDF documents from HTML/CSS                                      |
| 9   | **pdf_form_filling**       | Fill out PDF form fields programmatically                               |
| 10  | **pdf_signing**            | Add digital signatures to PDF documents                                 |
| 11  | **pptx_editing**           | Edit and modify PowerPoint presentations (.pptx)                        |
| 12  | **remotion_video**         | Create and render videos programmatically (motion graphics, animations) |
| 13  | **scheduled_crons**        | Create, modify, and delete scheduled cron jobs                          |
| 14  | **skill_creation**         | Create new reusable skills with proper structure                        |
| 15  | **slack_admin**            | Manage Slack workspace — channels, users, DMs, invitations              |
| 16  | **social_media_marketing** | Domain knowledge for your team — paid ads, content strategy             |
| 17  | **thread_orchestration**   | Monitor and coordinate parallel agent threads                           |
| 18  | **personal (per user)**    | Personal notes per team member — preferences, style, history            |
| 19  | **viktor_account**         | Viktor product knowledge — plans, credits, billing, support             |
| 20  | **viktor_spaces_dev**      | Build and deploy full-stack web apps with database & hosting            |
| 21  | **workflow_discovery**     | Investigate team, identify pain points, propose automation workflows    |

---

## 6. Tools & Capabilities

### File & System Tools

| Tool         | What it does                                  |
| ------------ | --------------------------------------------- |
| `bash`       | Execute shell commands in persistent session  |
| `file_read`  | Read any file (text, images, PDFs, notebooks) |
| `file_write` | Write/overwrite files                         |
| `file_edit`  | Exact string replacements in files            |
| `glob`       | Fast file pattern matching                    |
| `grep`       | Regex search across files                     |
| `view_image` | View and analyze images                       |

### Slack Tools

| Tool                                 | What it does                            |
| ------------------------------------ | --------------------------------------- |
| `coworker_send_slack_message`        | Send messages with Block Kit formatting |
| `coworker_slack_history`             | Backfill Slack message history          |
| `coworker_slack_react`               | Add emoji reactions                     |
| `coworker_delete_slack_message`      | Delete bot messages                     |
| `coworker_upload_to_slack`           | Upload files to Slack                   |
| `coworker_download_from_slack`       | Download files from Slack               |
| `coworker_list_slack_channels`       | List workspace channels                 |
| `coworker_join_slack_channels`       | Join channels                           |
| `coworker_leave_slack_channels`      | Leave channels                          |
| `coworker_open_slack_conversation`   | Open DMs or group DMs                   |
| `coworker_list_slack_users`          | List workspace users                    |
| `coworker_invite_slack_user_to_team` | Invite new users                        |
| `coworker_get_slack_reactions`       | Get reactions on messages               |

### LinkedIn Tools (26 functions)

| Tool                                          | What it does               |
| --------------------------------------------- | -------------------------- |
| `pd_linkedin_create_text_post_user`           | Post text as user          |
| `pd_linkedin_create_text_post_organization`   | Post text as organization  |
| `pd_linkedin_create_image_post_user`          | Post image as user         |
| `pd_linkedin_create_image_post_organization`  | Post image as organization |
| `pd_linkedin_create_comment`                  | Comment on posts           |
| `pd_linkedin_create_like_on_share`            | Like posts                 |
| `pd_linkedin_delete_post`                     | Delete posts               |
| `pd_linkedin_retrieve_comments_shares`        | Get comments on posts      |
| `pd_linkedin_get_member_profile`              | Get member profiles        |
| `pd_linkedin_get_current_member_profile`      | Get own profile            |
| `pd_linkedin_search_organization`             | Search organizations       |
| `pd_linkedin_get_organization_administrators` | Get org admins             |
| `pd_linkedin_fetch_ad_account`                | Fetch ad account info      |
| `pd_linkedin_proxy_get/post/put/patch/delete` | Direct LinkedIn API calls  |

### Browser Tools

| Tool                     | What it does                                |
| ------------------------ | ------------------------------------------- |
| `browser_create_session` | Open browser, navigate, interact with pages |
| `browser_download_files` | Download files from websites                |
| `browser_close_session`  | Close browser session                       |

### Email Tools

| Tool                      | What it does               |
| ------------------------- | -------------------------- |
| `coworker_send_email`     | Send emails                |
| `coworker_get_attachment` | Retrieve email attachments |

### Utility Tools

| Tool                                        | What it does                                  |
| ------------------------------------------- | --------------------------------------------- |
| `file_to_markdown`                          | Convert any file to readable markdown         |
| `ai_structured_output`                      | Parse unstructured data into typed structures |
| `coworker_text2im`                          | Generate images from text descriptions        |
| `quick_ai_search`                           | Web search with AI summarization              |
| `create_custom_api_integration`             | Create custom API connections                 |
| `resolve_library_id` / `query_library_docs` | Look up library documentation                 |

### Thread & Task Tools

| Tool                     | What it does                  |
| ------------------------ | ----------------------------- |
| `create_thread`          | Spawn parallel work threads   |
| `send_message_to_thread` | Send messages between threads |
| `wait_for_paths`         | Wait for threads to complete  |
| `list_running_paths`     | See active threads            |
| `get_path_info`          | Check thread status           |

### Scheduled Cron Tools

| Tool                 | What it does                                |
| -------------------- | ------------------------------------------- |
| `create_agent_cron`  | Create a recurring Viktor task (AI-powered) |
| `create_script_cron` | Create a recurring script task (code-only)  |
| `delete_cron`        | Remove a scheduled task                     |
| `trigger_cron`       | Manually trigger a cron                     |

### Viktor Spaces (Web App Builder)

| Tool                 | What it does                     |
| -------------------- | -------------------------------- |
| `init_app_project`   | Initialize a new web app project |
| `deploy_app`         | Deploy app to hosting            |
| `list_apps`          | List deployed apps               |
| `get_app_status`     | Check app status                 |
| `query_app_database` | Query app database               |
| `delete_app_project` | Delete an app                    |

---

## 7. Integrations

### Currently Connected

- **LinkedIn** — Sefy Tofan's account (urn:li:person:QfwFPlq7b6)
  - 5 organizations: vibey.im, Prism Workshops, Olympus, Healing Waves, CallVault
  - Full access: post, comment, like, stats, proxy API

### Available to Connect (3,141 total)

Any of these can be connected through the Viktor dashboard:

**Popular ones relevant to your work:**

- GitHub, Google Drive, OneDrive, Notion
- Salesforce, HubSpot, Stripe, PayPal
- Jira & Confluence, Linear, Asana, Monday.com
- Meta (Facebook/Instagram), Google Ads, TikTok
- Shopify, Wix, Webflow, Square
- Sentry, PostHog, Datadog
- Twilio, SendGrid, Mailchimp
- Zapier, Make (Integromat)
- ... and 3,100+ more

---

## 8. Cron System (Scheduled Tasks)

Crons are recurring tasks that Viktor runs automatically. There are two types:

### Agent Crons (AI-Powered)

A fresh Viktor instance boots up, reads the task description, and executes with full AI capabilities. Used for tasks requiring judgment, analysis, or complex reasoning.

### Script Crons (Code-Only)

A Python script runs on schedule without AI. Used for simple data pipelines, API syncs, and aggregations.

### Currently Active Crons

**1. Heartbeat** — `28 7,10,13,16 * * *` (4x daily at 7:28, 10:28, 13:28, 16:28)

- Proactive check-in to find opportunities to help
- Scans for new Slack messages, unanswered questions
- Offers research, reacts to messages, suggests automations
- Follows up on stale threads and blockers

**2. Workflow Discovery** — `28 9 * * 2,5` (Tue & Fri at 9:28)

- Investigates team members' work patterns
- Identifies pain points and automation opportunities
- Proposes personalized workflows via DM and channel posts
- Tracks proposals and follow-ups in discovery.md

### Each Cron Has:

```
crons/{name}/
├── task.json         ← Schedule + task description
├── LEARNINGS.md      ← What worked, what didn't, gotchas
├── execution.log     ← Run history
└── scripts/          ← Reusable utility scripts
```

The `LEARNINGS.md` is critical — since each cron run starts fresh with no memory, this file carries forward all accumulated knowledge.

---

## 9. Slack Integration

### How Viktor Reads Slack

Slack messages are synced to the workspace filesystem:

```
slack_visible/
├── {channel_name}/
│   ├── 2026-03.log          ← Monthly message logs
│   └── threads/
│       └── {thread_ts}.log  ← Individual thread logs
└── {user_name}/             ← DM logs (same structure)
```

Viktor can grep these files to find past conversations, context, and patterns.

### How Viktor Writes to Slack

- Send messages with rich Block Kit formatting (sections, headers, dividers, buttons, images)
- Upload files (PDFs, images, spreadsheets) and share links
- Add emoji reactions
- Reply in threads
- Create DMs and group conversations

### Your Slack Workspace

| Channel      | ID          | Bot Access               |
| ------------ | ----------- | ------------------------ |
| #social      | C0AJFLUCN3U | ✅ Yes                   |
| #all-vibey   | C0AJ998J6M9 | ⏳ Pending join approval |
| #new-channel | C0AJUJBSG2D | ⏳ Pending join approval |

---

## 10. SDK & Code Execution

### Python Environment

- **Runtime:** Python 3.13
- **Package manager:** `uv` (fast Python package manager)
- **Execute scripts:** `uv run python script.py`
- **Install packages:** `uv add <package>`

### Pre-installed Packages (35)

```
numpy, pandas, polars, httpx, requests, tenacity,
beautifulsoup4, lxml, python-docx, openpyxl, PyMuPDF,
pdfplumber, python-pptx, weasyprint, markdown, jinja2,
pillow, pydub, qrcode, matplotlib, plotly, fire, rich,
typer, regex, chardet, python-dateutil, unidiff, pydantic,
playwright, scipy, sympy, fastapi, shortuuid, cachetools
```

### What This Means Viktor Can Create

- **PDFs** — from HTML/CSS via WeasyPrint
- **Excel spreadsheets** — via openpyxl
- **Word documents** — via python-docx
- **PowerPoint presentations** — via python-pptx
- **Charts & visualizations** — via matplotlib, plotly
- **Images** — via pillow, AI image generation
- **Videos** — via Remotion (React-based)
- **Web apps** — via FastAPI + Viktor Spaces
- **QR codes** — via qrcode library
- **Data analysis** — via pandas, polars, numpy, scipy

---

## 11. How a Conversation Works (Lifecycle)

```
1. User sends message in Slack (DM or @viktor in channel)
      ↓
2. Viktor platform receives the message
      ↓
3. Fresh Viktor instance boots up with:
   - System prompt (core instructions)
   - Available skills list (from SKILL.md frontmatter)
   - Thread context (conversation history in this thread)
   - Access to full workspace (/work)
      ↓
4. Viktor reads relevant skills, company/team files
      ↓
5. Viktor writes & runs scripts, calls tools, does research
      ↓
6. Viktor sends response via Slack tools
      ↓
7. Viktor updates skills/learnings if needed
      ↓
8. Instance terminates (no memory retained except files on disk)
```

For scheduled crons, the lifecycle is similar but triggered by a timer instead of a Slack message, and the task description replaces the user message.

---

## 12. Company & Team Knowledge

### Company (company/SKILL.md)

- **Name:** SEFY TOFAN OÜ
- **Registration:** Estonian company, reg. 16181831
- **Founded:** March 2021
- **Activity:** Advertising agency (EMTAK 73111)
- **Revenue:** €422K (2021), €373K (2022)
- **Industry:** Performance marketing, paid ads, social media marketing, e-commerce brand scaling

### Team (team/SKILL.md)

| Member      | Role                                | Slack                | Email                |
| ----------- | ----------------------------------- | -------------------- | -------------------- |
| Sefy Tofan  | Founder/Owner, CTO of Vibey         | @sefy (U0AJFLU99SN)  | sefy@sefytofan.com   |
| Dylan Vanas | ROAS Founder, Performance Marketing | @dylan (U0AJDK0HFDL) | dylan@dylanvanas.com |

### LinkedIn Organizations (Connected)

| Organization    | LinkedIn ID |
| --------------- | ----------- |
| vibey.im        | 111226915   |
| Prism Workshops | 86813945    |
| Olympus         | 69746800    |
| Healing Waves   | 69745867    |
| CallVault       | 105200565   |

---

_This document reflects Viktor's complete workspace state as of March 5, 2026 — the day it was installed. Skills, learnings, and capabilities will grow over time as Viktor works with the team._
