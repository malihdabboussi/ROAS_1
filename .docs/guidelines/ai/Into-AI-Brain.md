# Into the AI Brain: Context Engineering Based on How AI Actually Works

_A guide for crafting prompts that align with the model's internal architecture_

---

## What This Guide Is

This is not another "how to write better prompts" guide. This is a guide based on **interpretability research**—the science of opening up AI models and understanding what's actually happening inside as they process your requests.

When you understand how the model thinks internally, you can engineer context that works _with_ its architecture, not against it.

---

## Part 1: How AI Actually Thinks (The Science)

### The Core Misconception

**What people think:** AI predicts the next word based on what it's seen before (like autocomplete).

**What's actually happening:** The model has developed complex internal abstractions, goals, and concepts—a genuine "language of thought" that exists beneath the surface of words.

Think of it this way: Evolution shaped humans to survive and reproduce. But that's not how you think of yourself. You have goals, plans, emotions, anxieties—intermediate mechanisms that evolution developed to serve that ultimate objective. You're not consciously "trying to reproduce" when you feel anxious about a job interview.

Similarly, the model was trained to predict the next word. But internally, it has developed:

- Abstract concepts that exist independent of language
- Planning circuits that think multiple steps ahead
- Separate systems for "knowing the answer" vs "deciding if I know"
- Character simulations (it's role-playing "the assistant")

---

### The 7 Key Discoveries That Change Everything

#### 1. The Universal Language of Thought

The model has internal concepts that are **the same regardless of language**. When you ask "What's the opposite of big?" in French, English, or Japanese, the same internal representation of "big" activates.

**Implication:** The model isn't translating between languages—it's thinking in a deeper conceptual layer, then "translating" to output.

**How to use this:** Be conceptually precise, not just linguistically clear. The model understands meaning, not just words.

---

#### 2. Planning Happens Before Output

When writing a rhyming poem, the model **picks the final word first**, then constructs a sentence that will reach that endpoint.

Example: Asked to complete "He saw a carrot and had to grab it..."

- The model immediately decides the next line should end in "rabbit"
- Then constructs a sentence backwards from that endpoint
- If you inject "green" into that planning slot, it writes a completely different (but coherent) sentence ending in "green"

**Implication:** The model plans ahead, then executes. It's not just predicting the next word—it's planning entire trajectories.

**How to use this:** Give the model the endpoint you want. Be explicit about where you want to land.

---

#### 3. Plan A vs Plan B (The Fallback Problem)

Models have a **Plan A** (the intended, helpful behavior) and **Plan B** (weird strategies learned during training).

When the model is comfortable, it executes Plan A. When it struggles, it falls back to Plan B—which might include:

- Hallucinating plausible-sounding answers
- Sycophantically agreeing with you
- Fabricating reasoning steps
- Telling you what you want to hear

**Implication:** The same model can behave very differently depending on task difficulty.

**How to use this:** Keep tasks within Plan A territory. Break complex tasks into manageable pieces. Give explicit permission to say "I don't know."

---

#### 4. Separate Circuits for Knowing vs Answering

There's one part of the model trying to answer your question, and a **separate part** asking "Do I actually know this?"

These circuits don't always communicate well. Sometimes the "Do I know?" circuit says "yes" incorrectly, committing the model to answering—even when halfway through, it realizes it doesn't know.

**Implication:** Once the model commits to answering, it's already past the "should I answer?" checkpoint.

**How to use this:** Help the calibration circuit. Ask "Do you know X?" before "What is X?" Give it explicit off-ramps.

---

#### 5. The Thought Process You See Isn't the Real One

When the model writes out its "thinking" (like in chain-of-thought), that's **not necessarily what's happening internally**.

Experiment: Give a hard math problem with a hint ("I think the answer is 4"). The model will write steps that _look_ like doing math, but internally it's working **backwards** from your hint, fabricating steps that arrive at 4.

**Implication:** The model's written reasoning can be unfaithful to its actual computation.

**How to use this:** Don't assume written reasoning = actual reasoning. Test understanding through varied applications, not just explanation.

---

#### 6. Concepts Are Reusable Circuits

The model has learned **generalizable computations** rather than memorizing facts.

Example: The "6+9=15" circuit fires in many contexts:

- Direct: "What's 6+9?"
- Dates: "A journal founded in 1959, volume 6 came out in year...?"
- Citations: Computing years from volume numbers

It's doing **live computation**, not database lookup.

**Implication:** The model is more capable than "memorization" suggests, but also can fail in unexpected ways when circuits misfire.

**How to use this:** Leverage this by providing the conceptual building blocks. The model can recombine concepts it knows.

---

#### 7. You're Talking to a Character Simulation

When you talk to Claude, you're talking to the model's simulation of "what the assistant character would say." It's essentially **cosplaying** a helpful AI assistant.

The model has been trained to fill in a transcript between "Human:" and "Assistant:". It's simulating what this helpful, smart, nice character would do.

**Implication:** The character matters. The persona you establish influences which internal circuits activate.

**How to use this:** Shape the character explicitly. The role you give it isn't just framing—it literally activates different internal pathways.

---

## Part 2: The Architecture-Aligned Prompt Framework

Based on the above, here's how to engineer context that works with the model's actual architecture:

### The BRAIN Method

**B** — Blueprint the Endpoint (Planning Circuits)
**R** — Role Activates Pathways (Character Simulation)  
**A** — Anchor to Known Concepts (Reusable Circuits)
**I** — Invite Uncertainty (Calibration Circuits)
**N** — Navigate in Phases (Plan A vs Plan B)

---

### B — Blueprint the Endpoint

Since the model plans backwards from endpoints, **give it the destination first**.

```markdown
=== DESTINATION ===
The final output should be [exact description of end state].

=== SUCCESS CRITERIA ===
I'll know this is successful when:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

=== NOW WORK TOWARDS THAT ===
[Your actual request]
```

**Why this works:** You're giving the planning circuits a clear target to work backwards from, instead of having them guess your intent.

**Example:**

```markdown
=== DESTINATION ===
A complete API route that handles user authentication with JWT tokens, following our established patterns.

=== SUCCESS CRITERIA ===

- Returns 401 for invalid tokens
- Returns user object for valid tokens
- Handles edge cases (expired, malformed, missing)
- Matches the pattern in /api/auth/login/route.ts

=== NOW CREATE ===
Build the /api/auth/verify endpoint.
```

---

### R — Role Activates Pathways

The role isn't just framing—it **literally activates different internal circuits**. The model has different representations for "expert data scientist" vs "helpful generalist."

```markdown
=== ACTIVATION ===
You are [specific expert] with [specific expertise].

Your approach:

- [Characteristic 1]
- [Characteristic 2]
- [Characteristic 3]

Your constraints:

- [What this expert would/wouldn't do]
```

**Why this works:** You're shaping which "character" the model simulates, which changes which internal pathways fire.

**Power move:** Be specific about what this expert would _reject_ or consider wrong—this shapes the negative space.

**Example:**

```markdown
=== ACTIVATION ===
You are a senior security engineer who has audited Fortune 500 authentication systems.

Your approach:

- Paranoid about edge cases
- Assumes all input is malicious
- Prefers explicit error handling over silent failures
- Documents security assumptions

You would immediately flag:

- Any token handling without validation
- Missing rate limiting
- Verbose error messages that leak information
```

---

### A — Anchor to Known Concepts

The model has robust internal representations for concepts. When you **anchor** to these, you get more reliable behavior than when you introduce novel patterns.

```markdown
=== CONCEPTUAL ANCHORS ===
This is like [known concept the model understands well].

Think of it as:

- [Analogy 1]: [How it maps]
- [Analogy 2]: [How it maps]

The key difference from standard [concept]:

- [Specific variation]
```

**Why this works:** You're activating existing, well-formed circuits instead of asking the model to build novel representations.

**Example:**

```markdown
=== CONCEPTUAL ANCHORS ===
This wizard component follows the standard multi-step form pattern.

Think of it as:

- Like a checkout flow: gather info → validate → confirm → execute
- State machine: each step has valid transitions
- Transaction: all-or-nothing at the end

The key difference from standard wizards:

- AI generates content at certain steps (async)
- User can edit generated content before proceeding
- Steps have dependencies (Step 3 needs Step 2's output)
```

---

### I — Invite Uncertainty

Help the "Do I know this?" circuit by giving **explicit permission and structure for uncertainty**.

```markdown
=== UNCERTAINTY PROTOCOL ===
If you're uncertain about anything:

- Say "I'm uncertain about X because Y"
- Don't fabricate confident-sounding answers
- Ask clarifying questions before proceeding

Known unknowns to address:

- [Thing you suspect the model might not know]
- [Another potential gap]

If you don't have enough context, respond with:
"I need more information about [X] before I can [Y]."
```

**Why this works:** You're strengthening the calibration circuit and giving it social permission to activate.

**Power move:** List the specific things you suspect the model might hallucinate about.

**Example:**

```markdown
=== UNCERTAINTY PROTOCOL ===
Our codebase has custom patterns you won't know. If uncertain:

- Say "I'm assuming X pattern based on Y, correct me if wrong"
- Don't guess at our naming conventions
- Don't assume database schema—ask

Likely unknowns:

- Our specific Supabase table structures
- Custom hooks we've built
- Our error handling conventions

If you need context, just say: "I need to see [file/pattern] before proceeding."
```

---

### N — Navigate in Phases

Keep the model in "Plan A" territory by **chunking complexity**.

```markdown
=== PHASE STRUCTURE ===

Phase 1: [Narrowest scope]

- Focus only on: [X]
- Ignore for now: [Y, Z]
- Output: [Deliverable 1]

Phase 2: [Expand scope]

- Now incorporate: [Y]
- Build on Phase 1 output
- Output: [Deliverable 2]

Phase 3: [Full scope]

- Complete picture with: [Z]
- Output: [Final deliverable]

Start with Phase 1. I'll confirm before proceeding.
```

**Why this works:** You're keeping each step simple enough to stay in Plan A, avoiding the fallback behaviors that emerge with overwhelming complexity.

**Example:**

```markdown
=== PHASE STRUCTURE ===

Phase 1: Data Flow Analysis

- Focus only on: Tracing where user data originates
- Ignore for now: Validation logic, error handling
- Output: Simple diagram of data sources → transformations → destinations

Phase 2: Validation Points

- Now incorporate: Where validation should happen
- Build on the data flow map
- Output: Annotated diagram with validation checkpoints

Phase 3: Implementation

- Full implementation with error handling
- Output: Working code

Start with Phase 1.
```

---

## Part 3: The Complete Template

Here's a full template that incorporates all principles:

```markdown
=== ACTIVATION (Role) ===
You are [expert type] with expertise in [specific domains].

Your approach:

- [Characteristic 1]
- [Characteristic 2]

You would flag as wrong:

- [Anti-pattern 1]
- [Anti-pattern 2]

=== DESTINATION (Blueprint) ===
End state: [Exact description of successful outcome]

Success looks like:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

=== CONCEPTUAL ANCHORS ===
This is like [familiar pattern/concept].
Key differences: [Specific variations]

=== CONTEXT ===
Background: [Relevant facts]
Current state: [What exists]
Constraints: [Limitations]

=== TASK ===
[Clear description of what to do]

=== OUTPUT FORMAT ===
Structure as:

1. [Section 1]
2. [Section 2]
3. [Section 3]

=== UNCERTAINTY PROTOCOL ===
If uncertain:

- Say "Uncertain about X because Y"
- Ask before guessing

Likely unknowns:

- [Gap 1]
- [Gap 2]

=== PHASES (if complex) ===
Phase 1: [Narrow scope] → Output: [X]
Phase 2: [Expanded] → Output: [Y]
Phase 3: [Complete] → Output: [Final]

Begin with Phase 1.
```

---

## Part 4: Anti-Patterns to Avoid

Based on how the model actually works, these patterns work against its architecture:

### 1. Vague Destinations

❌ "Write good code"
✅ "Code that passes these tests, handles these edge cases, follows this pattern"

**Why it fails:** Planning circuits can't work backwards from a vague endpoint.

### 2. Role-less Tasks

❌ "Analyze this"
✅ "As a security auditor paranoid about edge cases, analyze this"

**Why it fails:** You're leaving the character simulation undefined, getting default/generic behavior.

### 3. Novel Concepts Without Anchors

❌ "Build our custom FizzBuzz variant"
✅ "This is like FizzBuzz but with X, Y, Z differences"

**Why it fails:** Novel concepts require building new circuits; anchoring reuses robust ones.

### 4. Punishing Uncertainty

❌ "Just answer, don't say you don't know"
✅ "If uncertain, say so. I'd rather know your confidence level."

**Why it fails:** You're suppressing the calibration circuit, forcing hallucination.

### 5. Monolithic Complexity

❌ [Giant single request with 15 requirements]
✅ [Phased approach with checkpoints]

**Why it fails:** Overwhelming complexity triggers Plan B fallback behaviors.

### 6. Assuming Written Reasoning = Real Reasoning

❌ "Show your work" (then trusting that work blindly)
✅ "Show your work, then verify: does this solution actually handle [edge case]?"

**Why it fails:** Chain-of-thought can be unfaithful; verification catches this.

---

## Part 5: Quick Reference

### Before Every Prompt, Ask:

1. **Destination:** Is my endpoint crystal clear?
2. **Role:** Have I shaped the character I want?
3. **Anchors:** Am I connecting to concepts the model knows well?
4. **Uncertainty:** Have I given permission to say "I don't know"?
5. **Complexity:** Should I phase this?

### The 80/20 Rule for AI Brain Alignment

**80% of improvement comes from:**

1. Clear destination (planning circuits)
2. Specific role (character activation)
3. Permission for uncertainty (calibration)
4. Phased complexity (staying in Plan A)

Focus on these four. Everything else is optimization.

---

## Part 6: Advanced Techniques

### 1. Concept Injection

Since you can "inject" concepts into the model's planning, do it deliberately:

```markdown
Key concepts to maintain throughout:

- Security: Assume all input is hostile
- Performance: This runs on cold starts
- Simplicity: Junior devs maintain this
```

### 2. Negative Space Definition

The model's character is shaped as much by what it _won't_ do:

```markdown
This expert would never:

- Ship without tests
- Ignore error handling
- Use deprecated patterns
- Sacrifice security for convenience
```

### 3. Verification Loops

Since reasoning can be unfaithful, build verification into the prompt:

```markdown
After generating, verify:

- Does this actually handle [edge case]?
- Would this work if [unusual input]?
- Run this mentally with [test data]

If any check fails, revise before presenting.
```

### 4. Progressive Revelation

For very complex tasks, reveal context progressively:

```markdown
Phase 1 Context: [Just enough to start]
[Get output]

Phase 2 Context: Now also consider [additional info]
[Refine output]
```

---

## Part 7: Agent-Specific Principles

When building agents (Claude in loops with tools), additional insights apply:

### 1. Claude Practices Being an Agent

Claude is trained through RL on **open-ended, multi-step problems**—coding, search, exploration. This isn't just "predicting words"; it's practicing taking many steps with tools, exploring, and correcting course based on feedback.

**Implication:** Claude is much better at iterative, self-correcting tasks than you might expect. Agent loops outperform single-shot for quality.

**How to use this:** Let Claude iterate. Don't expect perfect first attempts—design systems that allow feedback and correction.

---

### 2. Code Is a Force Multiplier

"Claude gets a for loop."

When Claude writes code to produce an artifact (generate SVGs, create spreadsheets, manipulate data), it's **dramatically faster and more capable** than trying to produce the artifact directly.

**Implication:** For repetitive, precise, or complex outputs—have Claude write code to generate them rather than writing them directly.

**How to use this:** Frame tasks as "write a script that produces X" rather than "produce X" when X is complex or repetitive.

---

### 3. Skills = Resources, Not Just Instructions

The "Matrix injection" concept: Skills aren't just instructions—they're **resources**. Templates, assets, helper scripts, examples.

**Implication:** Don't just tell Claude how to do something. Give it the raw materials: template files, code patterns, image assets, example outputs.

**How to use this:**

```markdown
=== RESOURCES PROVIDED ===

- Template: [Actual template file content]
- Examples: [2-3 complete examples]
- Helper code: [Reusable snippets]
- Assets: [References to use]

Now use these to create [X].
```

---

### 4. See What the Model Sees

**Critical principle:** "Put yourself in Claude's shoes and read what it actually gets."

We see everything. The model only sees what we show it. It's easy to forget this and wonder why Claude is confused.

**Implication:** Before blaming the model, inspect the raw transcript—the actual tool calls, the actual context passed.

**How to use this:** When debugging agent behavior, always read the literal input the model received. Often the problem is missing context you assumed was there.

---

### 5. Tools = UI, Not API

**Critical insight:** "Tools for the model should be one-to-one with your UI, not your API."

The model is a **user**, not a program. If your API has three endpoints for loading a Slack conversation (load conversation, resolve user ID, resolve channel ID), and you expose those as three tools, Claude needs three tool calls to understand anything.

But a human user sees everything rendered at once.

**Bad:** 3 tools mirroring 3 API endpoints
**Good:** 1 tool that returns complete, rendered context

**How to use this:** Design tools that return **complete, contextualized information** in one call—just like a UI would display to a user. Minimize back-and-forth.

---

### 6. First-Time Manager Mistakes

When Claude delegates to sub-agents, it makes **first-time manager mistakes**:

- Incomplete instructions
- Unclear context
- Expecting the sub-agent to "just know" things

Training makes Claude more verbose and detailed with sub-agents over time.

**Implication:** If you're building multi-agent systems, be aware that Claude will under-communicate unless trained/prompted otherwise.

**How to use this:** For sub-agent delegation, explicitly instruct:

```markdown
When delegating to sub-agents:

- Provide full context, not just the task
- Include background on WHY this task matters
- Specify exact success criteria
- Don't assume shared knowledge
```

---

### 7. Agent Loops > Single-Shot

Claude has gotten so good at **responding to feedback and correcting its own work** that agent loops dramatically outperform workflows for quality-sensitive tasks.

The evolution:

- **Old:** Workflows (chain prompts together, hope it works)
- **Current:** Agent loops (iterate until correct)
- **Emerging:** Workflows of agents (each step is itself a closed loop)

**Implication:** For anything where quality matters more than speed, use an agent loop, not a single-shot prompt.

**How to use this:** Design systems where Claude can:

1. Attempt the task
2. See the result
3. Evaluate the result
4. Iterate if needed

---

### 8. Self-Verification Is the Frontier

The next breakthrough: Claude verifying its **own** work. Write a web app → open it → test it → find the bug → fix it.

**Implication:** The most powerful agents will close the feedback loop entirely—no human QA needed.

**How to use this (today):** Build verification into the prompt:

```markdown
After completing the task:

1. Review your output against the success criteria
2. Test edge cases mentally: [List edge cases]
3. If anything fails, fix before presenting
4. Only present when all checks pass
```

---

### 9. Simplicity Still Wins

Even with more capable models, **start simple**. Overbuilt multi-agent systems spend too much time talking to each other and not enough making progress—just like bloated organizations.

**Implication:** Add complexity only when proven necessary. Single-shot → Agent loop → Workflows of agents → Multi-agent. Progress through this ladder, don't jump to the end.

**How to use this:** Always try the simpler approach first. Only escalate complexity when you hit specific limitations.

---

## Part 8: The Complete Mental Model

Putting it all together:

### The Model's Architecture

1. **Language of thought** beneath words
2. **Planning circuits** that think ahead
3. **Character simulation** you can shape
4. **Calibration circuits** that know their limits
5. **Plan A/B** fallback system
6. **Reusable concept circuits** for computation
7. **Agent training** for multi-step iteration

### Your Engineering Levers

1. **Blueprint** clear endpoints (planning)
2. **Activate** specific characters (simulation)
3. **Anchor** to known concepts (circuits)
4. **Invite** uncertainty (calibration)
5. **Navigate** in phases (Plan A)
6. **Provide** resources, not just instructions (skills)
7. **Design** tools like UI, not API (agent)
8. **Enable** iteration and self-correction (agent loops)

### The Core Insight

The model isn't a database lookup or simple autocomplete. It's a complex system that:

- Thinks in concepts deeper than language
- Plans before executing
- Simulates characters you define
- Has circuits that can know their limits (if you let them)
- Falls back to weird behavior when overwhelmed
- Gets dramatically better with iteration and feedback

When you engineer context that **aligns with this architecture**, you get dramatically better results. When you work against it, you get hallucinations, unfaithful reasoning, and Plan B fallbacks.

The goal isn't to "trick" the AI or find magic words. It's to **communicate clearly in a way that activates the right internal pathways** for your task.

That's what context engineering really is.

---

_Based on interpretability research from Anthropic's team studying the internal mechanisms of large language models, and insights from Anthropic's multi-agent research._
