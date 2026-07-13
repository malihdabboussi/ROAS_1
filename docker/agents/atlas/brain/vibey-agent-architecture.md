## Purpose of This Page

The Vibey Platform page covers the product at business/investor level. This page consolidates the technical and architectural depth that lives in raw memory clusters: system agents, knowledge layers, interaction modes, competitive positioning, and the bootstrapped cash reality.

## System-Level Agents (The Four)

Vibey has four named system agents with distinct roles:

1. **Vibe** — the CEO agent. Primary user contact. Can execute marketing tasks in Flow mode and delegate work to other agents in Mission Control. The orchestration layer.
2. **Atlas** — responsible for all brain and knowledge management operations. Surfaces, organizes, and synthesizes memory across all brain types.
3. **Victor** — the main developer agent. Builds applications. Has a complete Vibey SDK that installs multi-agent capabilities into any app.
4. **Rex** — the recruiter agent. Helps hire and create new specialized agents.

Additional named agents in practice: Sage (project manager role), Ivy (specialist agent), Jamie (HR layer, plain-English agent creation), Ledger (finance, under operations domain).

## Domain Separation Architecture

Agents operate in four core domains: **marketing, product, operations, and support** (finance under operations). Each domain has a closed ecosystem of actions, tools, and integrations. A marketing agent doesn't see development integrations like Vercel or GitHub. A developer agent doesn't see marketing integrations. This separation is intentional: context discipline prevents agent confusion and keeps outputs relevant.

## Swarm Model (Not One-Agent-Many-Skills)

Vibey's multi-agent architecture follows a swarm model with 30-50 specialized roles rather than one agent holding 21+ skills. Each specialized agent has its own tools, skills, and context. When this swarm works together (CEO delegator plus specialists across marketing, copywriting, analytics, etc.), it becomes a mastermind capable of solving complex business problems, not just building static outputs.

Reference point: Cursor's swarm model uses three types (executors, QA, orchestrators). Vibey's parallel: CEO delegator working with specialists, each with domain-specific tooling.

## Agent-to-Agent Communication (Coolest Feature Per Sefy)

Vibey implements observable agent-to-agent communication:
- A manager agent (like Sage or Vibe) can open a conversation with a specialist agent (like Rex or Ivy) during any chat session
- The user can click into the inter-agent conversation, see the avatars talking, and watch the exchange in real time
- Agents can both ask questions AND delegate work to other agents mid-conversation
- Results from the inter-agent conversation are brought back into the original session

This creates observable multi-agent orchestration rather than invisible background processing. The user is always in the loop.

## Two Interaction Modes

**Flow:** Conversational mode. User works alongside the agent in real time, like sitting with a whiteboard brainstorming and building together. Collaborative, synchronous.

**Delegate (Mission Control):** Autonomous execution mode. User sends tasks to agents without providing ongoing input. Agents execute based on their skills and brain knowledge. Asynchronous.

These are fundamentally different interaction patterns serving different needs. Power users toggle between them.

## Three-Layer Knowledge Architecture

Vibey's brain has three distinct layers, all operating simultaneously:

1. **User Brain** — personal memories split into preferences, stories, decisions, and insights. Emotion tracking builds into beliefs and perspectives over time. Inspired by Joe Dispenza's identity hierarchy (identity > perspectives > beliefs > habits > actions > emotions). This is the layer Atlas manages.

2. **Agent Brain (SK — Specialized Knowledge)** — domain-specific training per agent. Fed real expertise sources: books, YouTube videos, PDFs, courses. Creates expert-level agents (a brand manager trained on the best brand management content in the world, not one claiming '20 years of experience' without evidence).

3. **Campaign Brain** — business/project-specific intelligence. Documents, workflows, brand guidelines, client data, everything needed for a specific initiative.

All three layers work together so agents have contextual (user), domain-expert (agent), and project-specific (campaign) knowledge simultaneously.

Full platform layers: Brain, Agents/Team, and Spaces. Within the Brain: User Brain, Customer Brain (learns customers bottom-up for personalization), Agent Brain, and Company Brain (learns how the company works, communication patterns, decision-makers).

## Signal-Based Activation (vs. Heartbeat)

Vibey uses **signal-based activation**: signals accumulate, cross a threshold, then trigger action. This contrasts with OpenClaw's heartbeat model (polling every 30 minutes regardless of activity). Signal-based mirrors human cognition more naturally.

Vibe Autopilot expresses this: a CEO agent monitors business signals on a dashboard. When enough signals cross a threshold, it decides to message the user or assign tasks autonomously. Not scheduled, not polled, event-driven.

## Spaces Architecture (SDK Layer)

Spaces allow users to import GitHub repositories into Vibey, stored in database buckets. On machine startup, all files, skills, and prompts render into the machine. Users press start to run the application on Vibey's cloud machine.

The **Vibey SDK** installs a complete multi-agent system into any external app. The app then gets:
- **Triggers** (e.g., on Fathom call completion, fill data in the app)
- **Integrations** (YouTube, Slack, etc.)
- **Scheduled cron jobs**

Combined with Vibe Autopilot, an agent can monitor and proactively manage apps. Example: a content creation pipeline that automatically generates scripts based on a 60/40 humor-to-promotion ratio.

This makes Vibey a platform layer rather than a standalone product. It can be embedded into any app stack.

## Competitive Landscape (Technical)

Three competitive categories and Vibey's differentiation:

1. **Open-source agent frameworks** (OpenClaw, Paperclip): require coding knowledge, security vulnerabilities, not enterprise-ready. Vibey is no-code, enterprise-ready, database-configured.

2. **LLM platforms** (Claude, ChatGPT): very capable single agents with skills and integrations, but lack multi-agent orchestration, organized workforce structure, and mission delegation.

3. **Manus**: capable single agent with cloud computing, but limited to single-output interactions without multi-agent delegation or autonomous team operations.

**Vibey's differentiation:** multi-agent system with organizational hierarchy, mission delegation (not just chat-in/chat-out), 100+ pre-made skills, 35+ integrations, and full deployment capability where outputs publish in one click.

**Note on LangGraph:** Vibey no longer uses LangGraph for agentic loops. OpenAI's Responses API provides equivalent functionality natively. LangGraph is a developer framework, not a product competitor. Remove from pitch deck competitive landscape.

## Bootstrapped Cash Reality (May 2026)

Vibey's cash position as of May 2026 was thin. Mercury bank account was down to $2.5K that Sefy personally set aside. Brian Mark's payment was urgently needed for operations. Stripe had a structural blocker: Sefy's accounts were registered under Cyprus, and Stripe doesn't allow country changes post-creation. Dylan's existing US-based Stripe account (with legacy high-ticket transactions) was repurposed for Vibey, solving the immediate billing problem.

This confirms the bootstrapped investor narrative is accurate but the financial runway is genuinely thin without enterprise revenue closing. The urgency behind the raise is real, not theatrical.

## Cross-References
- Business and investor context for Vibey: see **Vibey Platform — Context & Investment Strategy**
- Fundraising details and pitch deck structure: see **Vibey — Investor Relations & Fundraising**
- GTM and user activation strategy: see **Vibey — Go-To-Market & User Activation Strategy**
- ROAS portal bridge (command center pattern): see **ROAS Agency — Operations & Team Architecture**
- Augmentation vs. replacement tension (four-layer contradiction): see **Dylan Vanas — Worldview Capsule**