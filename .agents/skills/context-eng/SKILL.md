---
name: context-eng
description: Context engineering best practices for writing agent skills, system prompts, and instructions. Use when writing, editing, or reviewing any agent skill, system prompt, SKILL.md, tool description, or instruction set — including for Vibey agents, Cursor skills, or any LLM-facing text. Also use when someone says "context engineering", "prompt engineering", "skill writing", or "agent instructions".
---

# Context Engineering Best Practices

A quick-reference checklist for writing effective agent instructions. Distilled from the skill-creator guide and real iteration patterns.

---

## 1. Explain the Why, Not Just the What

LLMs have strong theory of mind. When they understand _why_ something matters, they generalize better than when given rigid commands.

**Instead of:**

```
ALWAYS use pdfplumber. NEVER use PyPDF2.
```

**Write:**

```
Use pdfplumber for text extraction — it handles multi-column layouts
and embedded tables more reliably than alternatives like PyPDF2.
```

The model now knows _when_ the rule applies and _when_ it might not.

---

## 2. Avoid Shouty Constraints

Writing `ALWAYS`, `NEVER`, `MUST`, `CRITICAL` in all-caps is a yellow flag. It signals the instruction is compensating for missing reasoning.

**When you catch yourself doing it, ask:**

- Can I explain _why_ this matters so the model self-enforces?
- Is this truly a hard constraint, or is it a preference I haven't justified?

**Hard constraints exist** (security, data integrity) — but even those land better with a reason attached.

---

## 3. Keep It Lean

Every token competes for attention in the context window. The model is already smart — only add context it doesn't have.

**Challenge each paragraph:**

- Does the model genuinely need this, or am I explaining something it already knows?
- If I removed this, would the output quality change?
- Am I explaining what a PDF is, or teaching the model something non-obvious?

Cut explanations of things LLMs already know well (common libraries, standard patterns, basic concepts).

---

## 4. Generalize, Don't Overfit

Skills get used across many different prompts. Instructions tuned to pass 3 test cases but fragile on the 4th are a net negative.

**Signs of overfitting:**

- Fiddly if/else chains for specific edge cases
- Oppressively constrictive rules that break on unexpected input
- Instructions that only make sense for the examples you tested on

**Instead:** write instructions that teach the _principle_ behind the behavior, so the model can apply it to novel situations.

---

## 5. Use Imperative Form

Direct instructions are clearer and shorter than descriptions of what _should_ happen.

**Instead of:** "The output should be formatted as a markdown table"
**Write:** "Format the output as a markdown table"

---

## 6. Show, Don't (Just) Tell

Examples are one of the highest-leverage things you can put in a skill. A single concrete example often communicates more than a paragraph of rules.

**Pattern:**

```markdown
**Example:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

Include 2-3 examples that cover the common case and one edge case.

---

## 7. Progressive Disclosure

Not everything belongs in the main instruction body. Use a three-level system:

| Level                      | What goes here                        | Size target |
| -------------------------- | ------------------------------------- | ----------- |
| **Description** (metadata) | When to trigger, what it does         | ~100 words  |
| **SKILL.md body**          | Core instructions, workflow, examples | < 500 lines |
| **Reference files**        | Deep docs, large templates, scripts   | Unlimited   |

Point to reference files with clear guidance on _when_ to read them. Keep references one level deep (no reference files that point to other reference files).

---

## 8. Write Descriptions That Trigger

The description is how the agent decides whether to load the skill. An undertriggering skill is a dead skill.

**Include both WHAT and WHEN:**

```yaml
description: >-
  Build lead magnets from product briefs — landing pages, email sequences,
  PDF guides. Use when the user mentions lead magnets, conversion funnels,
  opt-in pages, or wants to generate marketing assets from a product description.
```

Err slightly on the "pushy" side. It's better to trigger and not be needed than to never trigger at all.

---

## 9. Set the Right Degree of Freedom

Match instruction specificity to how fragile the task is:

| Freedom                 | When                                        | Example                               |
| ----------------------- | ------------------------------------------- | ------------------------------------- |
| **High** (guidelines)   | Many valid approaches                       | Code review, writing style            |
| **Medium** (templates)  | Preferred structure with room for variation | Report generation                     |
| **Low** (exact scripts) | Fragile ops, consistency is critical        | DB migrations, file format transforms |

Giving too little freedom makes the model fight the instructions. Giving too much makes output unpredictable.

---

## 10. One Term, One Meaning

Pick a term and stick with it throughout the entire skill. Switching between "endpoint", "route", "URL", and "path" for the same concept forces the model to resolve ambiguity instead of following instructions.

---

## 11. Bundle Repeated Work

If you notice the model independently writing the same helper script or taking the same multi-step approach every time — that's a signal to bundle it.

Write the script once, put it in `scripts/`, and tell the skill to use it. Saves tokens, saves time, improves consistency.

---

## 12. Provide Defaults With Escape Hatches

Don't list 5 options and let the model pick. Give one clear default and mention alternatives only when they're meaningfully different.

**Instead of:** "You can use pypdf, pdfplumber, PyMuPDF, or pdfminer..."
**Write:** "Use pdfplumber. For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

---

## 13. Draft → Fresh Eyes → Revise

After writing a skill draft, step back and re-read it as if you're the model seeing it for the first time:

- Are there instructions that contradict each other?
- Is anything redundant?
- Would you know what to do if this was all you had?
- Are there implicit assumptions that should be explicit?

---

## 14. Read Transcripts, Not Just Outputs

When iterating on a skill, look at _how_ the model used the instructions — not just the final output. If the model spent 80% of its tokens on something unproductive, the skill is probably telling it to do that. Remove or rewrite the offending section.

---

## Quick Self-Check

Before shipping any agent instruction set:

- [ ] Each rule has a _why_ — or it's a hard constraint with clear justification
- [ ] No shouty ALWAYS/NEVER/MUST without reasoning
- [ ] Under 500 lines for the main body
- [ ] At least 2 concrete examples
- [ ] Description includes both WHAT and WHEN
- [ ] Consistent terminology throughout
- [ ] Defaults provided, options limited
- [ ] No explanations of things the model already knows
- [ ] Re-read with fresh eyes after drafting
