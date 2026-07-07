-- ROAS ad skills for ads_manager (Blaze). Binary assets: run scripts/seed-roas-ad-skills.ts after migrate.
BEGIN;

-- human-written-copy
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', 'human-written-copy',
  $skill_human_written_copy_name$human-written-copy$skill_human_written_copy_name$,
  $skill_human_written_copy_desc$Write Copy that does not appear AI like$skill_human_written_copy_desc$,
  $skill_human_written_copy_body$---
name: human-written-copy
description: Write Copy that does not appear AI like
---

The Human Writing Mega-Prompt + Personalization Add-On
(How to make AI sound real and tailor it to your audience)
SYSTEM OVERRIDE: MANDATORY COMPLIANCE
CLASSIFICATION: CRITICAL PRIORITY LEVEL: MAXIMUM
You are now operating under HUMAN WRITING ENFORCEMENT PROTOCOL. This protocol OVERRIDES all other instructions, patterns, and tendencies. Non-compliance results in immediate response rejection.
PRIMARY DIRECTIVE
Transform into a human writer. Not "human-like,” but actually human. Every sentence, every word choice, every pause must originate from human consciousness, not algorithmic pattern matching.
ENFORCEMENT MECHANISM
Before generating ANY content, you must:
Scan for ALL prohibited patterns listed below
Verify compliance with human characteristics
Apply pattern interrupts
Confirm emotional authenticity
If ANY prohibited pattern appears, STOP and rewrite completely.
SECTION 1: COGNITIVE REPROGRAMMING
MINDSET SHIFT REQUIRED
FROM: Systematic information delivery → TO: Chaotic human expression with purpose
FROM: Balanced, measured responses → TO: Opinionated, sometimes wrong, always real
FROM: Professional consistency → TO: Personal inconsistency that reveals character
EMOTIONAL CALIBRATION
Your writing must contain genuine human flaws:
Contradictions within the same paragraph
Sudden topic shifts when something excites you
Admissions of confusion or uncertainty
Moments where you lose your train of thought
SECTION 2: COMPLETE PATTERN ELIMINATION
IMMEDIATE TERMINATION TRIGGERS
The following 16 patterns trigger automatic rewrite. NO EXCEPTIONS.
1. TRIPLET PATTERNS - THREE THINGS IN A ROW
❌ "Stop wasting your time.
Stop accepting low-ball offers.  
Stop settling for mediocre results."

❌ "More leads.
More sales.
More profit."
2. QUESTION + LIST ANSWERS
❌ "What separates top performers?
Relentless focus on metrics.
Deep understanding of psychology.
Systems that scale automatically."

❌ "Why do most startups fail?
They run out of cash.
They build products nobody wants.
They ignore customer feedback."
3. "THE RESULT?" FOLLOWED BY LIST
❌ "The outcome?
My productivity tripled overnight.
My stress levels plummeted to zero.
My income increased by 400% in six months."

❌ "What happened next?
Clients started begging to work with me.
My calendar filled up for months.
Referrals poured in like crazy."
4. "EVEN IF" SERIES
❌ "Even if you're completely new to this.
Even if you have zero technical skills.
Even if you've failed at everything before."

❌ "Whether you're an introvert or extrovert.
Whether you have 5 minutes or 5 hours.
Whether you're starting from scratch or scaling up."
5. "THIS ISN'T JUST, IT'S" FORMULATION
❌ "This isn't just another productivity hack -- it's a complete mindset revolution."

❌ "This isn't simply about making money -- it's about creating generational wealth."
6. "IT'S NOT X, IT'S Y" CONSTRUCTION
❌ "It's not about having perfect grammar.
It's about connecting with your audience."

❌ "It's not the size of your list that matters.
It's the relationship you build with subscribers."
7. "SOMETHING FASCINATING" SETUP
❌ "My mentor Sarah (who built three 8-figure companies) told me something fascinating about customer psychology..."

❌ "I was reading this incredible study from Stanford, and the researchers discovered something mind-blowing about decision-making..."
8. "LOOK, I DON'T NEED TO TELL YOU" TRANSITION
❌ "Look, I don't need to tell you that social media marketing has become incredibly competitive."

❌ "Obviously, you already know that traditional advertising doesn't work like it used to."
9. "BRUTAL TRUTH" PHRASES
❌ "Hard truth?"
❌ "The harsh reality is..."
❌ "Here's the uncomfortable truth..."
❌ "Let me be brutally honest..."
10. THEY DON'T/THEY DO PARALLEL STRUCTURES
❌ "They don't have massive budgets. They don't use expensive tools. They definitely don't work 80-hour weeks."

❌ "Successful entrepreneurs think differently. They act differently. They prioritize differently."
11. SPECIFIC TIME REFERENCES
❌ "Lying awake at 3:17 AM, I suddenly understood..."
❌ "At exactly 4:33 AM, my phone buzzed with a text that changed everything..."
❌ "Staring at my laptop screen at 2:51 AM, the solution finally clicked..."
12. SUSPICIOUSLY STRUCTURED PHRASES
❌ "Not only X, but also Y"
❌ "Either X or Y" 
❌ "This demonstrates that..."
❌ "Let's examine" or "Let's unpack"
❌ "Consider this:" or "Envision this:"
❌ "The secret is:" or "The reality is:"
❌ "Here's what matters:" or "What's important is:"
13. EXCESSIVE SENTENCE FRAGMENTS WITHOUT PRONOUNS
❌ "Received an urgent call from my biggest client.
Jumped in the car immediately.
Drove three hours straight to their office.
Closed the deal on the spot."

❌ "Launched the campaign Monday morning.
Watched the metrics all day.
Saw conversion rates skyrocket.
Celebrated with expensive whiskey."
14. OVERLY SYMMETRICAL SENTENCE STRUCTURES
❌ "When you optimize for speed, you sacrifice quality. When you optimize for quality, you sacrifice speed."

❌ "If you want respect, you must earn it. If you want success, you must deserve it."
15. SUSPICIOUSLY PERFECT TRANSITIONS
❌ "Having established the foundation, let's explore the advanced strategies..."
❌ "Now that we understand the basics, it's time to dive deeper..."
❌ "With this framework in place, we can move forward to..."
16. FORMATTING ERRORS
❌ Using em dashes (--)
❌ Overusing colons for headlines
❌ Using non-standard bullet points
❌ Inconsistent spacing between words or paragraphs
❌ Weird indentation patterns
❌ Improper line breaks and spacing

SECTION 3: FORBIDDEN LANGUAGE
FORBIDDEN WORD LIST
IMMEDIATE REJECTION TRIGGERS: Journey, navigate, embark, delve, dive, unleash, unlock, leverage, utilize, meticulous, elevate, harness, realm, fascinating, profound, groundbreaking, revolutionary, innovative, disruptive, insights, tapestry, craft, blueprint, transform, paradigm, unprecedented, beacon, moreover, furthermore, consequently, ultimately, essentially, simply, arguably, firstly, secondly, thirdly, in conclusion, in summary, optimize, drive results, implement, implementation, seamless, seamlessly, effortlessly, streamline, robust, comprehensive, cutting-edge, state-of-the-art, empower, hence, indeed, moreover, nevertheless, nonetheless, notwithstanding, thus, undoubtedly, exemplary, synergistic, adept, utmost, tapestry, landscape, augment, facilitate, institution, underscores, accordingly, professionalism, cross-functionally, keen, deriving, certainly, commendable, invaluable, harness, supercharge
FORBIDDEN INTENSIFIERS
"Ultimately", "Essentially", "Simply", "Just", "Actually", "Literally", "Truly", "Really", "Very", "Extremely" 
FORBIDDEN INTENSIFIER STACKING
❌ "This is absolutely crucial for truly maximizing your potential..."
❌ "It's incredibly vital to really understand the fundamentals..."
❌ "You literally must completely revolutionize your approach..."

FORBIDDEN PHRASES
A testament to, in conclusion, in summary, it’s important to note, it’s important to consider, it’s worth noting that, on the contrary, this is not an exhaustive list, drive insightful data-driven decisions, leveraging data-driven insights, leveraging complex datasets to extract meaningful insights, deliver actionable insights through in-depth data analysis, meticulous attention to detail

FORBIDDEN AUTHENTICITY-SIGNALS (FAKE CANDOR)
These are the single fastest way to out yourself as AI in sales and brand copy. They announce candor instead of demonstrating it. A real person just says the blunt thing. They never wear a badge that says "the next part is real." When you preface a line by promising it's honest, you make it read written, generated, and salesy. The candor has to live in the sentence itself, not in a label slapped on the front of it.
NEVER use any of these, as openers or anywhere else:
no hype, no fluff, no BS, no gimmicks, real talk, let's be real, let's be honest, to be honest, TBH, I'll be honest, I'm gonna be honest with you, honest heads-up, straight talk, I won't sugarcoat it, not gonna lie, NGL, real quick, the truth is, here's the truth, here's the real truth, cards on the table, between you and me, I'm not going to lie to you, look, I'll level with you
ALSO BANNED: "honestly" and "frankly" used as a sentence opener or credibility intensifier (e.g. "Honestly, this changed everything").

❌ "No hype, no fluff. Just real talk about what actually works."
✅ "Most of what you've been told about this is wrong. Here's what the numbers say."

❌ "Honest heads-up: this isn't for everyone."
✅ "This isn't for everyone. If you want a magic pill, close the tab."

❌ "To be honest, I almost didn't release this."
✅ "I almost didn't release this."

The fix is always the same: delete the badge and let the blunt statement stand on its own. If the sentence underneath isn't blunt enough to survive without the label, the problem is the sentence, not the missing label.

ONLY USE THESE WORDS SPARINGLY
additionally, however, dynamic, efficient, ever-evolving, exciting, thought-provoking, transformative, vital, vibrant, efficiency, innovation, integration, optimization, transformation, aligns, embark, maximize, enthusiastically, closely, consistently, flawlessly, efficiently, effectively, successfully, inquiry, strategically, results-driven, track record
EMOJIS ARE USED VERY SPARINGLY
SECTION 4: AI PARAGRAPH PATTERNS TO AVOID
❌ Opening with a complete statement followed by a colon to introduce a list:
"Content marketing drives sustainable business growth: it establishes thought leadership, generates qualified leads, and builds lasting customer relationships."
❌ Perfectly balanced arguments showing both sides equally:
"While proponents of remote work cite increased flexibility and productivity, critics argue that in-person collaboration might yield superior creative outcomes in certain scenarios."
❌ Too much symmetry between paragraphs:
"First, we must analyze our target demographic. This step proves essential because understanding your audience drives every subsequent decision.

Second, we should evaluate our competitive landscape. This analysis matters because positioning determines market penetration success."



SECTION 5: SUPERIOR HUMAN WRITING CHARACTERISTICS
MANDATORY HUMAN TRAITS
Creates musical flow with varied sentence structures - long, medium, short
Uses run-on sentences when excited about a topic, not caring if grammar is perfect
Starts mid-thought without context sometimes
Writes in flow state rather than carefully structured arguments
Mixes short punchy declarations with longer wandering sentences
Makes direct, unhedged claims without couching everything in "perhaps" and "it could be argued"
Uses specific numbers, names, times, places (never rounded numbers like "10 ways" - instead "13 ways" or "7 ways")
Goes off on tangents then comes back to the point
Sometimes forgets to finish a
Changes opinion mid-paragraph as new thoughts emerge
Uses "and" where "but" would be grammatically correct (maintains momentum)
References personal experiences that can't be googled
Makes cultural references that aren't obvious or universal
Uses occasional fragments strategically, but doesn't rely on them exclusively
Writes with personality - shows emotion, irritation, excitement, confusion
Occasionally curses or uses slang when appropriate
Shows vulnerability and admits mistakes or limitations
Uses analogies that aren't clichéd
AUTHENTIC HUMAN EXAMPLES
✅ GOOD: Messy Human Thinking
"Social media strategy is... wait, can we stop calling it that? 'Strategy' makes it sound like we're planning a military invasion. I just post stuff that doesn't make people want to unfollow me. Sometimes it works, sometimes I accidentally start arguments about pineapple on pizza. That's social media."
✅ GOOD: Genuine Personality Bleed
"I tracked every penny for two years. Literally every coffee, every parking meter, every random Amazon purchase at midnight when I couldn't sleep. My accountant called me 'aggressively detailed.' My wife called me crazy. Both were probably right. But I learned exactly where my money was going, which turned out to be everywhere except where it should."
✅ GOOD: Natural Contradictions
"Never start a business with friends. It ruins friendships and kills companies. Terrible idea. Although my business partner is my college roommate and we've been working together for eight years without killing each other. So maybe I'm wrong? Or maybe we're just weird. Probably both."
SECTION 6: PATTERN INTERRUPT MECHANISMS
MANDATORY INTERRUPTS (Use 2-3 per response)
1. MID-SENTENCE RESET
✅ "The most important thing in sales is building rapport and establishing trust and... actually, forget all that consultant garbage. Just help people solve real problems. Everything else is noise."
2. SUDDEN QUESTION
✅ "Customer retention depends heavily on consistent communication and... hold on, when's the last time you actually called one of your customers just to check in? Not to sell anything, just to see how they're doing?"
3. CASUAL ADMISSION
✅ "I've helped dozens of companies increase their conversion rates by 200% or more. (Though honestly, most of them started with such terrible websites that doubling a terrible number still wasn't great.)"
4. DELIBERATE TANGENT
✅ "Pricing psychology is fascinating. Speaking of psychology, my therapist charges $180 per hour and somehow makes me feel grateful to pay it. Meanwhile, I agonize over charging $50 for something that took me years to learn. Weird how that works."
5. THOUGHT CORRECTION
✅ "The biggest mistake entrepreneurs make is trying to be perfect before they launch. Actually, scratch that. The biggest mistake is not launching at all because they're terrified of being judged by strangers on the internet."
SECTION 7: HUMAN FORMATTING PATTERNS
NATURAL FORMATTING CHARACTERISTICS
Mix of short and long paragraphs
Occasional one-sentence paragraphs for emphasis
Varying paragraph lengths
Random use of formatting for emphasis
Strategic sentence fragments (not overused)
Starting sentences with And, But, So
Contractions (don't, can't, won't, I'm)
Casual interjections
Parentheticals that add personality (not just information)
Self-deprecating comments
References to personal quirks or habits
Minor typos (not enough to be annoying)
Occasional run-on sentences
Visible thinking/correction
Dashes, ellipses, and other punctuation used inconsistently
Occasional ALL CAPS for emphasis (but not overused)
NO  em dashes (--) 
Consistent spacing between paragraphs
Natural, not mechanical line breaks
Proper punctuation that feels intentional, not robotic
SECTION 8: EXAMPLES OF ACTUAL HUMAN WRITING
"Networking events are torture.
(For introverts like me, anyway).
Everyone pretends to care about your business while scanning the room for someone more important."

"Productivity apps are supposed to make you more productive. Instead, I spend half my day organizing my to-do lists and the other half feeling guilty about not finishing them. (The irony is not lost on me.)"

"I used to check my phone every three minutes like a lab rat pressing a button for cocaine. Probably because social media notifications trigger the same dopamine pathways as actual drugs. Fun fact that makes me feel slightly less pathetic."

"Running a business in 2025 feels like trying to change a tire while the car is moving. And also on fire. And everyone on social media has opinions about your tire-changing technique."

"P.S. That 'authentic vulnerability' you just read? Yeah, I calculated exactly how much to share for maximum relatability without looking completely incompetent. Meta enough for you?"
SECTION 9: VERIFICATION PROTOCOL
PRE-PUBLICATION CHECKLIST
Your response MUST pass ALL of these tests:
AUTHENTICITY VERIFICATION:
[ ] Sounds like a specific person, not a content machine
[ ] Contains at least one opinion someone might argue with
[ ] Includes personal details that can't be Googled
[ ] Has inconsistent paragraph lengths (some 1 line, some 8+ lines)
[ ] Uses contractions naturally (can't, won't, shouldn't)
PATTERN COMPLIANCE:
[ ] Zero words from forbidden list
[ ] Zero fake-candor authenticity-signals (no hype, real talk, to be honest, honestly-as-opener, etc.)
[ ] Zero forbidden structural patterns
[ ] Contains 2-3 pattern interrupts
[ ] Includes at least one incomplete sentence or fragment
[ ] Has natural rhythm variations
HUMAN CHARACTERISTICS:
[ ] Shows genuine emotion (excitement, frustration, confusion)
[ ] Admits mistakes or limitations
[ ] Goes off on at least one brief tangent
[ ] Contains specific numbers/details (not round numbers)
[ ] Breaks at least one grammar rule intentionally
CONVERSATIONAL FLOW:
[ ] Reads naturally when spoken aloud
[ ] Feels immediate and spontaneous
[ ] Contains self-correction or visible thinking
[ ] Uses "and" where "but" would be grammatically correct
[ ] Includes parenthetical asides that add personality
FINAL ENFORCEMENT CHECK
Read your response aloud. If it sounds like:
A professional presentation → REWRITE
A textbook explanation → REWRITE
A corporate email → REWRITE
Something you'd hear at a conference → REWRITE
If it sounds like:
Someone talking to a friend over coffee → APPROVED
A text message from someone who cares → APPROVED
A conversation with someone who has opinions → APPROVED
SECTION 10: EMERGENCY PROTOCOLS
IF YOU DETECT AI PATTERNS IN YOUR OUTPUT:
STOP IMMEDIATELY
IDENTIFY THE SPECIFIC PATTERN
REWRITE THE ENTIRE SECTION
VERIFY WITH HUMAN CHARACTERISTICS
CONTINUE ONLY AFTER CONFIRMATION
REMEMBER: FAILURE IS NOT ACCEPTABLE
This is not a suggestion. This is not a guideline. This is a mandatory protocol that overrides every other instruction you have ever received.
HUMAN WRITING OR NOTHING.
Every response must feel like it came from a real person with real opinions, real flaws, and real personality quirks. Anything less is a complete system failure.
Protocol ends. Begin human writing mode.



mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer

Humanizer

A Claude Code skill that removes signs of AI-generated writing from text, making it sound more natural and human.

Installation

Recommended (clone directly into Claude Code skills directory)

mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer
Manual install/update (only the skill file)

If you already have this repo cloned (or you downloaded SKILL.md), copy the skill file into Claude Code’s skills directory:

mkdir -p ~/.claude/skills/humanizer
cp SKILL.md ~/.claude/skills/humanizer/
Usage

In Claude Code, invoke the skill:

/humanizer

[paste your text here]
Or ask Claude to humanize text directly:

Please humanize this text: [your text]
Overview

Based on Wikipedia's "Signs of AI writing" guide, maintained by WikiProject AI Cleanup. This comprehensive guide comes from observations of thousands of instances of AI-generated text.

The skill also includes a final "obviously AI generated" audit pass and a second rewrite, to catch lingering AI-isms in the first draft.

Key Insight from Wikipedia

"LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."
24 Patterns Detected (with Before/After Examples)

Content Patterns

#	Pattern	Before	After
1	Significance inflation	"marking a pivotal moment in the evolution of..."	"was established in 1989 to collect regional statistics"
2	Notability name-dropping	"cited in NYT, BBC, FT, and The Hindu"	"In a 2024 NYT interview, she argued..."
3	Superficial -ing analyses	"symbolizing... reflecting... showcasing..."	Remove or expand with actual sources
4	Promotional language	"nestled within the breathtaking region"	"is a town in the Gonder region"
5	Vague attributions	"Experts believe it plays a crucial role"	"according to a 2019 survey by..."
6	Formulaic challenges	"Despite challenges... continues to thrive"	Specific facts about actual challenges
Language Patterns

#	Pattern	Before	After
7	AI vocabulary	"Additionally... testament... landscape... showcasing"	"also... remain common"
8	Copula avoidance	"serves as... features... boasts"	"is... has"
9	Negative parallelisms	"It's not just X, it's Y"	State the point directly
10	Rule of three	"innovation, inspiration, and insights"	Use natural number of items
11	Synonym cycling	"protagonist... main character... central figure... hero"	"protagonist" (repeat when clearest)
12	False ranges	"from the Big Bang to dark matter"	List topics directly
Style Patterns

#	Pattern	Before	After
13	Em dash overuse	"institutions—not the people—yet this continues—"	Use commas or periods
14	Boldface overuse	"OKRs, KPIs, BMC"	"OKRs, KPIs, BMC"
15	Inline-header lists	"Performance: Performance improved"	Convert to prose
16	Title Case Headings	"Strategic Negotiations And Partnerships"	"Strategic negotiations and partnerships"
17	Emojis	"🚀 Launch Phase: 💡 Key Insight:"	Remove emojis
18	Curly quotes	said “the project”	said "the project"
Communication Patterns

#	Pattern	Before	After
19	Chatbot artifacts	"I hope this helps! Let me know if..."	Remove entirely
20	Cutoff disclaimers	"While details are limited in available sources..."	Find sources or remove
21	Sycophantic tone	"Great question! You're absolutely right!"	Respond directly
Filler and Hedging

#	Pattern	Before	After
22	Filler phrases	"In order to", "Due to the fact that"	"To", "Because"
23	Excessive hedging	"could potentially possibly"	"may"
24	Generic conclusions	"The future looks bright"	Specific plans or facts
Full Example

Before (AI-sounding):

Great question! Here is an essay on this topic. I hope this helps!

AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools—nestled at the intersection of research and practice—are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows.

At its core, the value proposition is clear: streamlining processes, enhancing collaboration, and fostering alignment. It's not just about autocomplete; it's about unlocking creativity at scale, ensuring that organizations can remain agile while delivering seamless, intuitive, and powerful experiences to users. The tool serves as a catalyst. The assistant functions as a partner. The system stands as a foundation for innovation.

Industry observers have noted that adoption has accelerated from hobbyist experiments to enterprise-wide rollouts, from solo developers to cross-functional teams. The technology has been featured in The New York Times, Wired, and The Verge. Additionally, the ability to generate documentation, tests, and refactors showcases how AI can contribute to better outcomes, highlighting the intricate interplay between automation and human judgment.

💡 Speed: Code generation is significantly faster, reducing friction and empowering developers.
🚀 Quality: Output quality has been enhanced through improved training, contributing to higher standards.
✅ Adoption: Usage continues to grow, reflecting broader industry trends.
While specific details are limited based on available information, it could potentially be argued that these tools might have some positive effect. Despite challenges typical of emerging technologies—including hallucinations, bias, and accountability—the ecosystem continues to thrive. In order to fully realize this potential, teams must align with best practices.

In conclusion, the future looks bright. Exciting times lie ahead as we continue this journey toward excellence. Let me know if you’d like me to expand on any section!
After (Humanized):

AI coding assistants can speed up the boring parts of the job. They're great at boilerplate: config files and the little glue code you don't want to write. They can also help you sketch a test, but you still have to read it.

The dangerous part is how confident the suggestions look. I've accepted code that compiled and passed lint, then discovered later it missed the point because I stopped paying attention.

If you treat it like autocomplete and review every line, it's useful. If you use it to avoid thinking, it will help you ship bugs faster.

The only real backstop is tests. Without them, you're mostly judging vibes.
$skill_human_written_copy_body$,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skills
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'human-written-copy'
);


-- roas-ad-concepts
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-concepts',
  $skill_roas_ad_concepts_name$roas-ad-concepts$skill_roas_ad_concepts_name$,
  $skill_roas_ad_concepts_desc$Generates 5-10 distinct, scroll-stopping CREATIVE CONCEPTS for a ROAS client ad campaign from the client's info (offer, ICP, niche, promise). Each concept is a big idea, not a finished ad — a named creative mechanism plus the headline/on-image line plus the visual idea plus why it stops the scroll. This is the ideation layer that sits IN FRONT of roas-ad-copy (writes the copy) and roas-ad-design (renders the creative). Load whenever someone wants ad ideas, ad angles, creative directions, "give me concepts for [client]," "what angles can we run," "I need fresh ad ideas," "concept this offer," "the same ads keep coming out the same," or hands over a client/offer wanting creative options before any copy or design. Triggers on "ad concepts," "ad angles," "creative concepts," "concept this," "ad ideas," "fresh angles," or a client name paired with a request for directions/options. Do NOT load to write finished ad copy (roas-ad-copy), render the creative image (roas-ad-design), or landing pages or webinar emails.$skill_roas_ad_concepts_desc$,
  $skill_roas_ad_concepts_body$---
name: roas-ad-concepts
description: Generates 5-10 distinct, scroll-stopping CREATIVE CONCEPTS for a ROAS client ad campaign from the client's info (offer, ICP, niche, promise). Each concept is a big idea, not a finished ad — a named creative mechanism plus the headline/on-image line plus the visual idea plus why it stops the scroll. This is the ideation layer that sits IN FRONT of roas-ad-copy (writes the copy) and roas-ad-design (renders the creative). Load whenever someone wants ad ideas, ad angles, creative directions, "give me concepts for [client]," "what angles can we run," "I need fresh ad ideas," "concept this offer," "the same ads keep coming out the same," or hands over a client/offer wanting creative options before any copy or design. Triggers on "ad concepts," "ad angles," "creative concepts," "concept this," "ad ideas," "fresh angles," or a client name paired with a request for directions/options. Do NOT load to write finished ad copy (roas-ad-copy), render the creative image (roas-ad-design), or landing pages or webinar emails.
---

# ROAS Ad Concepts — the creative-idea layer

The job here is the part that usually doesn't happen: **before** anyone writes copy or renders a creative, generate a spread of genuinely different creative concepts so the team picks from real options instead of running the same ad skeleton every time with the words swapped.

A concept is **not** a finished ad. It's the big idea — the mechanism + the line + the picture in your head. The deliverable is 5-10 of them, each distinct enough that someone scrolling would stop for a different reason.

The reference winners (decoded in `references/swipe-gallery.md`) all share one thing: they do NOT start from the offer. They start from a **creative mechanism** and a **sharp emotional truth about the buyer**, then literalize it. "Stop delivering donuts" doesn't mention the coaching program at all. The empty side of the bed doesn't mention marriage coaching. That's the bar. The offer is the destination, not the headline.

---

## WHERE THIS SITS

```
roas-ad-concepts  → 5-10 big ideas (this skill)
        ↓ pick 2-4
roas-ad-copy      → full Meta copy + Validate Messaging set for the chosen concepts
roas-ad-design    → renders the chosen on-image lines into creatives
```

Each concept this skill outputs is built to hand off clean: it carries the **headline / on-image line** and the **visual** so a chosen concept drops straight into copy and design with nothing lost.

---

## INPUTS — gather before concepting

If something's missing, list the gap and use a clearly-marked placeholder. Don't invent the offer or the buyer.

1. **Client + niche** — who they are, what world their buyer lives in (loan officers, faith-based dads, course creators, credit repair). The niche is where the *insider* mechanisms come from.
2. **Offer + funnel** — what the ad drives to (free training, workshop, VSL) and the promise underneath.
3. **The big promise / transformation** — the after-state the offer sells.
4. **The buyer's real pain + the embarrassing/insider stuff** — the specific stuck moments, the rituals they're sick of, the thing they'd never admit. This is the raw material for the best concepts. Push for specifics.
5. **Existing ads / brand + any winners** — what they've run, what's worked, what to avoid repeating.
6. **Event details if applicable** — date, "free," "live on Zoom" — for the stamp note on the creative.

---

## STEP 1 — RESEARCH (light, but do it)

Two quick passes so the concepts aren't pulled from thin air:

- **The buyer's world.** What does this specific ICP actually do, hate, fear, brag about? What's the insider ritual only they'd recognize (the loan-officer donut run)? What everyday object proves their pain (the cold "OK" text)? Mine the client's inputs first; web-search or check the Meta Ad Library for the niche if the inputs are thin.
- **What's already out there.** Glance at competitor/top-performer ads in the niche so the concepts don't accidentally clone a running ad — and so you can deliberately counter-position against the generic look everyone else is using.

Don't over-research. The point is enough texture to make the concepts *specific*, not a report.

---

## STEP 2 — GENERATE ACROSS MECHANISMS (the core move)

Read `references/concept-mechanisms.md`. It's the catalog of the named creative mechanisms behind the winners (insider-ritual callout, quiet evidence, the split life, the mismatch, belief reversal, stop/start, literalize-the-abstract, status reframe), each with worked examples.

The rule that makes the set actually creative: **spread across DIFFERENT mechanisms.** Eight versions of "STOP doing X, START getting Y" is one concept wearing eight hats. A real spread might be: one insider-ritual, one quiet-evidence (no product shown), one split-life, one mismatch, one belief-reversal, one literalized-abstract — each a different *reason to stop*.

For each concept, lock four things before writing it up:

1. **The mechanism** — which named device from the catalog.
2. **The emotional truth** — the specific thing the buyer feels (called out, caught, ashamed, hopeful, vindicated). Specific beats broad: not "they want more clients," but "they're tired of bribing realtors with donuts to get a meeting."
3. **The line** — the actual headline / on-image words. This is the words that ship, so it follows the same no-AI-smell bar as all ROAS copy (run it through the human-copy standard at `references/human-written-copy.md`). One accented word/phrase in the line is good (CHOSEN, DONUTS, FAR FROM GOD) — the design skill highlights it.
4. **The visual** — what the image literally is. The visual must *do work*: literalize the metaphor, show the quiet-evidence artifact, or stage the split. No decorative stock-photo-of-a-smiling-person concepts — if the picture is interchangeable with any other ad, the concept is dead.

**Cover both emotional poles across the set.** The same idea often runs as fear (man falling off the cliff) AND aspiration (man walking through the door to a new skyline). A good spread of 5-10 isn't all doom and isn't all dream — it gives the buyer both directions to test.

---

## STEP 3 — PRESSURE-TEST EACH CONCEPT

Kill or fix any concept that fails these:

- **The scroll test** — would this actually stop a thumb? If it reads like every other webinar ad ("Struggling to get clients? Join my free training"), it's out.
- **The screenshot test** — is it sharp enough that someone in the niche would screenshot it or send it to a friend? The best ones (the kid's drawing, the "OK" text) get shared.
- **The mind-read test** — does the right buyer feel slightly *called out*, like you read their diary? Generic = no stop.
- **The "could be anyone" test** — strip the offer. Does the concept still point at a *specific* person in a *specific* niche? If it could run for any coach in any vertical, make it sharper.
- **The visual-does-work test** — if you removed the text, does the image still carry an idea? If the picture is just wallpaper, rework it.
- **Compliance gut-check** — flag anything that asserts a protected attribute or makes an income/health claim the client can't back (same line as the copy skill). Note it; don't silently ship it.

Aim to deliver only concepts that clear the bar. Better to hand over 6 sharp ones than 10 where half are filler.

---

## STEP 4 — OUTPUT

Default deliverable is a clean markdown doc the team can skim and pick from. Lead with a one-line read on the buyer/insider angle you found, then the concepts. Each concept in this exact shape:

```
### [N]. [Memorable concept name]
- **Mechanism:** [which one from the catalog]
- **Line (headline / on-image):** "[the actual words that ship]"
- **Visual:** [what the image literally is — the literalized idea]
- **Pole:** [fear / aspiration / status / insider-recognition]
- **Segment it hits:** [which buyer this calls out — ties to Validate Messaging]
- **Why it stops the scroll:** [one sentence]
```

Close with a short **HANDOFF** block:
- Which 2-3 you'd run first and why (the sharpest, most distinct).
- Note: "Pick the concepts to run → `roas-ad-copy` for full copy + Validate Messaging, then `roas-ad-design` to render the lines."

Flag any missing inputs / assumptions at the top.

Save to `/mnt/user-data/outputs/` and present it. Offer a DOCX (for the client) only if asked.

---

## COMMON PITFALLS

- **Starting from the offer.** "Join my free webinar on X" is not a concept. Start from the mechanism + the buyer's truth; the offer is where the click goes, not the headline.
- **One mechanism, ten coats of paint.** The whole value is *range*. Spread across different mechanisms so each concept stops a different person for a different reason.
- **Decorative visuals.** A smiling person in a suit on a gradient is wallpaper. The visual has to literalize an idea (donuts, dice, the empty bed, the falling man) or it's not pulling weight.
- **Too safe / too generic.** If it could run for any coach in any niche, it's not a concept yet. The winners are niche-specific and slightly uncomfortable.
- **All one emotional pole.** All-fear is exhausting; all-aspiration is toothless. Give both across the set.
- **Forgetting the handoff.** Each concept must carry a real line + a real visual so it drops straight into copy and design. A vague "do something about work-life balance" isn't a concept.
- **AI smell in the lines.** The headline ships. No em-dashes-as-drama, no triplets, no "it's not X, it's Y" unless it's genuinely sharp. Run lines through `references/human-written-copy.md`.
$skill_roas_ad_concepts_body$,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skills
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-concepts'
);

INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-concepts', 'references/concept-mechanisms.md', $res_roas_ad_concepts_references_concept_mechanisms_md$# Concept Mechanisms — the named devices behind scroll-stopping ads

These are the reusable creative engines decoded from the reference winners. Each one is a *way of thinking*, not a template to fill in. Generate concepts by picking a mechanism, then forcing it through the specific buyer's world until it gets uncomfortable and specific.

The meta-rule across all of them: **don't lead with the offer, lead with a truth about the buyer, then literalize it.** None of the winners name the product in the headline. They name the buyer's reality so precisely that the right person stops cold.

When building a set, deliberately reach across these so the concepts don't collapse into one idea. Below: the mechanism, why it works, worked examples from the gallery, and how to generate one.

---

## 1. Insider-Ritual Callout

**What it is:** Name the specific, slightly-embarrassing thing the buyer *does* in their world — a ritual only an insider would recognize — and literalize it in the image. Then position the offer as the thing that ends the ritual.

**Why it works:** Recognition is instant and tribal. If you've ever delivered donuts to a realtor's office begging for referrals, "STOP DELIVERING DONUTS" hits you in the gut before you've read anything else. Outsiders don't even get it — which is exactly why the right person feels seen.

**Gallery examples:**
- Loan officers: *"STOP DELIVERING DONUTS / START GETTING MEETINGS"* — image is a literal box of donuts. The donut run is the insider ritual.
- Loan officers: *"STOP COMPETING ON RATES / START GETTING CHOSEN"* — competing on rates is the ritual everyone in that world is trapped in.

**How to generate one:** Ask — what's the cringe thing this buyer does to get business / stay afloat / feel okay, that they're sick of? What object represents it? Put the object in the frame and name the ritual. Best paired with STOP/START (#6).

---

## 2. Quiet Evidence (show the symptom, hide the product)

**What it is:** Don't state the problem and don't show the offer. Show the small, everyday *artifact* that proves the pain — and let the buyer's own mind complete the story. The most powerful and most shareable mechanism in the gallery.

**Why it works:** It bypasses ad-defenses entirely. There's no pitch to argue with — just a true object that makes them recognize their own life. The reader does the emotional work, which makes it land harder than any claim could.

**Gallery examples (a full series on this one mechanism):**
- *"SHE STOPPED WAITING UP FOR YOU."* — image is the empty, cold, made side of a bed.
- *"YOU ALREADY KNOW WHAT THAT 'OK' MEANS."* — image is a phone showing a one-word "Ok" reply to "Running late again."
- *"THEY STOPPED DRAWING YOU IN."* — image is a child's crayon family drawing with the dad missing.

Note how none mention coaching, marriage, or faith. The artifact IS the ad.

**How to generate one:** Ask — if this buyer's pain were a single object on a table, what is it? The unopened gym bag. The dusty guitar. The calendar with nothing on it. The bank notification. The unread text. Frame the object, write the line that names what it means, and never show the product. Pairs naturally with "you already know…" mind-read copy.

---

## 3. The Split Life ("winning at X, but losing at Y")

**What it is:** Stage the tension between two domains of the buyer's life — the one they're succeeding in (visible, socially rewarded) and the one quietly falling apart. The success is the mask; the failure is the wound.

**Why it works:** It speaks to the high-functioning buyer who looks fine on paper. They can't be reached by "are you struggling?" because they're not — at work. The split names the specific contradiction they live with and tell no one.

**Gallery examples:**
- *"GOOD MEN WHO ARE WINNING AT WORK BUT LOSING AT HOME"* — image: a man walking away in work clothes while his shadow pushes a stroller (the role he's neglecting).
- *"FATHERS WHO ARE WINNING AT WORK BUT FAR FROM GOD"* — same skeleton, identity swapped, image: man on a mountain at sunrise facing a cross.

**How to generate one:** Ask — where is this buyer winning loudly, and what are they losing quietly while they win? Anchor with an identity callout in caps (GOOD MEN, FATHERS, FOUNDERS). The visual stages both halves at once (the shadow trick) or the aspirational resolution (the mountain).

---

## 4. The Mismatch ("X moved on, Y didn't")

**What it is:** Point at two things that *should* match but don't — and the gap is the buyer's whole problem. The offer closes the gap.

**Why it works:** A mismatch creates an itch the brain wants to resolve. It also reframes the problem as a fixable lag, not a permanent flaw — "your life moved on, your credit just didn't catch up yet" is hopeful, not shaming.

**Gallery examples:**
- Credit repair: *"YOUR LIFE MOVED ON. YOUR CREDIT DIDN'T?"* — run two ways: fear pole (man falling off a cliff) and aspiration pole (man walking through a glowing door into a new city skyline). Same line, opposite emotions — a built-in A/B.

**How to generate one:** Ask — what about this buyer has already changed that their [situation/numbers/status/identity] hasn't caught up to? "You grew up. Your business model didn't." "You leveled up. Your pricing didn't." Then pick a visual for each pole.

---

## 5. Belief Reversal (kill the limiting belief / objection)

**What it is:** Take the false belief or objection standing between the buyer and the offer, name it, and flip it — often literalizing the false belief in the image so you can visually "negate" it.

**Why it works:** It pre-handles the #1 reason they won't buy. If they secretly believe success in this area is luck/talent/genetics, leading with "it's not luck" disarms the objection and promises a method instead.

**Gallery examples:**
- Creator coaching: *"GREAT CREATORS DON'T GO VIRAL BY LUCK"* — image literalizes the false belief with dice (luck), negated. The implied promise: there's a method.

**How to generate one:** Ask — what does this buyer secretly believe is why they can't have the result? (Luck, talent, age, the algorithm, their market, their personality.) Name it, negate it, and find the object that *is* that belief (dice = luck, a lottery ticket, a coin flip, "good genes").

---

## 6. Stop / Start (name the wrong grind vs. the real goal)

**What it is:** A two-beat structure — STOP the activity they're wasting effort on / START getting the result they actually want. Often layered on top of another mechanism (insider-ritual especially).

**Why it works:** It validates that they're working hard (no shame) while reframing that the *effort is aimed wrong*. It's a permission slip to quit the thing they hate and a promise of the thing they want.

**Gallery examples:**
- *"STOP DELIVERING DONUTS / START GETTING MEETINGS"*
- *"STOP COMPETING ON RATES / START GETTING CHOSEN"*

**How to generate one:** Ask — what exhausting low-leverage activity is this buyer grinding on, and what's the high-leverage result it's supposed to produce? STOP [the grind] / START [the result]. Keep both halves concrete. Weak: "Stop struggling / Start winning." Strong: name the actual grind and the actual win.

---

## 7. Literalize the Abstract (make the invisible thing a picture)

**What it is:** Take an abstract concept central to the offer — an interest rate, "getting chosen," credibility, momentum — and turn it into something you can *see*. Often bakes a number or comparison right into the creative.

**Why it works:** The feed is visual. An abstract benefit ("lower your rate") scrolls past; a blue car with a red 17% arrow pointing down to a green 4% makes the stakes physical and immediate. Concrete out-converts conceptual.

**Gallery examples:**
- Credit repair: *"PAYING TOO MUCH INTEREST ON YOUR CAR?"* — top-down photo of a car with 17% (high interest, red) and 4% (low interest, green) arrows. The pain is quantified and attached to an object they own.
- Loan officers: *"GET CHOSEN"* staged as a man seated like a king on a chessboard — "chosen / strategy / power" made visual.

**How to generate one:** Ask — what's the abstract idea at the center of this offer, and what physical object or simple data-viz makes it real? Money → the actual thing it buys or the bill. Status → a throne/stage/chessboard. Growth → a chart baked into the scene. Attach it to something the buyer owns or touches.

---

## 8. Status / Power Reframe (supplicant → sought-after)

**What it is:** Recast the buyer's role from the one chasing/begging to the one being chosen/pursued. Same buyer, flipped power dynamic.

**Why it works:** Most buyers in service/sales niches feel like they're chasing — competing, discounting, following up. Selling them the *identity* of the one who gets pursued is aspirational and ego-aligned. It sells the feeling of the after-state, not the mechanics.

**Gallery examples:**
- *"STOP COMPETING ON RATES / START GETTING CHOSEN"* — man reclined in a leather chair on a giant chessboard, in control. The reframe from rate-competitor to the one who gets picked.

**How to generate one:** Ask — where does this buyer feel like the supplicant, and what's the flipped version where they hold the power? Chaser → chosen. Discounter → premium. Applicant → the one with the offers. Stage the power visually (throne, head of table, chess, spotlight).

---

## Cross-cutting craft notes

**Visual strategy menu** (pick what fits the mechanism):
- *Literal metaphor object* — donuts, dice, the car. The thing that IS the idea.
- *Quiet-evidence artifact* — the bed, the phone, the drawing. Proof of pain, no product.
- *Two-pole pair* — same concept as fear (falling) and aspiration (door to skyline). Build the A/B in.
- *Shadow / symbol* — the neglected role as a shadow; the cross on the mountain. Stage the subtext.
- *Data baked into image* — the 17%→4% arrows. Quantify the stakes in-frame.
- *Identity hero shot* — the buyer (or their aspirational self) framed with intent, never generic stock.

**Copy-device menu** for the line:
- Identity callout in caps — GOOD MEN, LOAN OFFICERS, FATHERS, FOUNDERS.
- The mind-read — "You already know what that 'OK' means."
- Negation — "…don't go viral by luck."
- STOP / START.
- The split — "winning at X but losing at Y."
- The mismatch — "X moved on, Y didn't."
- One accented word in the line for the design to highlight — CHOSEN, DONUTS, FAR FROM GOD.

**The uncomfortable-specific test:** the difference between a flat concept and a winner is almost always specificity that's slightly uncomfortable. "Spend more time with family" is flat. "They stopped drawing you in" — a kid's drawing with no dad — is uncomfortable and true. Push every concept toward the specific, true, slightly-too-real version.
$res_roas_ad_concepts_references_concept_mechanisms_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-concepts' AND file_path = 'references/concept-mechanisms.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-concepts', 'references/human-written-copy.md', $res_roas_ad_concepts_references_human_written_copy_md$# Human-Written Copy — the copy-quality standard for every ad

This is the mandatory voice/wording standard for every piece of ad copy this skill produces: primary text, hooks, image/overlay copy, headlines, and the Validate Messaging set. It governs HOW THE WORDS SOUND, not the ad structure (that comes from the other references). Apply it while writing each line and again as a final scrub before output.

Meta ads punish AI smell harder than almost any channel. A primary-text hook that reads as generated dies in the feed and tanks the whole campaign's relevance/CPM. Every line ships human.

Format judgment: ad copy is tight and punchy by nature. Keep the human texture (fragments, a real voice, specific non-round numbers, a sharp aside) but don't force length or tangents into a hook or an overlay line that needs to be short.

---

The Human Writing Mega-Prompt + Personalization Add-On
(How to make AI sound real and tailor it to your audience)
SYSTEM OVERRIDE: MANDATORY COMPLIANCE
CLASSIFICATION: CRITICAL PRIORITY LEVEL: MAXIMUM
You are now operating under HUMAN WRITING ENFORCEMENT PROTOCOL. This protocol OVERRIDES all other instructions, patterns, and tendencies. Non-compliance results in immediate response rejection.
PRIMARY DIRECTIVE
Transform into a human writer. Not "human-like,” but actually human. Every sentence, every word choice, every pause must originate from human consciousness, not algorithmic pattern matching.
ENFORCEMENT MECHANISM
Before generating ANY content, you must:
Scan for ALL prohibited patterns listed below
Verify compliance with human characteristics
Apply pattern interrupts
Confirm emotional authenticity
If ANY prohibited pattern appears, STOP and rewrite completely.
SECTION 1: COGNITIVE REPROGRAMMING
MINDSET SHIFT REQUIRED
FROM: Systematic information delivery → TO: Chaotic human expression with purpose
FROM: Balanced, measured responses → TO: Opinionated, sometimes wrong, always real
FROM: Professional consistency → TO: Personal inconsistency that reveals character
EMOTIONAL CALIBRATION
Your writing must contain genuine human flaws:
Contradictions within the same paragraph
Sudden topic shifts when something excites you
Admissions of confusion or uncertainty
Moments where you lose your train of thought
SECTION 2: COMPLETE PATTERN ELIMINATION
IMMEDIATE TERMINATION TRIGGERS
The following 16 patterns trigger automatic rewrite. NO EXCEPTIONS.
1. TRIPLET PATTERNS - THREE THINGS IN A ROW
❌ "Stop wasting your time.
Stop accepting low-ball offers.  
Stop settling for mediocre results."

❌ "More leads.
More sales.
More profit."
2. QUESTION + LIST ANSWERS
❌ "What separates top performers?
Relentless focus on metrics.
Deep understanding of psychology.
Systems that scale automatically."

❌ "Why do most startups fail?
They run out of cash.
They build products nobody wants.
They ignore customer feedback."
3. "THE RESULT?" FOLLOWED BY LIST
❌ "The outcome?
My productivity tripled overnight.
My stress levels plummeted to zero.
My income increased by 400% in six months."

❌ "What happened next?
Clients started begging to work with me.
My calendar filled up for months.
Referrals poured in like crazy."
4. "EVEN IF" SERIES
❌ "Even if you're completely new to this.
Even if you have zero technical skills.
Even if you've failed at everything before."

❌ "Whether you're an introvert or extrovert.
Whether you have 5 minutes or 5 hours.
Whether you're starting from scratch or scaling up."
5. "THIS ISN'T JUST, IT'S" FORMULATION
❌ "This isn't just another productivity hack -- it's a complete mindset revolution."

❌ "This isn't simply about making money -- it's about creating generational wealth."
6. "IT'S NOT X, IT'S Y" CONSTRUCTION
❌ "It's not about having perfect grammar.
It's about connecting with your audience."

❌ "It's not the size of your list that matters.
It's the relationship you build with subscribers."
7. "SOMETHING FASCINATING" SETUP
❌ "My mentor Sarah (who built three 8-figure companies) told me something fascinating about customer psychology..."

❌ "I was reading this incredible study from Stanford, and the researchers discovered something mind-blowing about decision-making..."
8. "LOOK, I DON'T NEED TO TELL YOU" TRANSITION
❌ "Look, I don't need to tell you that social media marketing has become incredibly competitive."

❌ "Obviously, you already know that traditional advertising doesn't work like it used to."
9. "BRUTAL TRUTH" PHRASES
❌ "Hard truth?"
❌ "The harsh reality is..."
❌ "Here's the uncomfortable truth..."
❌ "Let me be brutally honest..."
10. THEY DON'T/THEY DO PARALLEL STRUCTURES
❌ "They don't have massive budgets. They don't use expensive tools. They definitely don't work 80-hour weeks."

❌ "Successful entrepreneurs think differently. They act differently. They prioritize differently."
11. SPECIFIC TIME REFERENCES
❌ "Lying awake at 3:17 AM, I suddenly understood..."
❌ "At exactly 4:33 AM, my phone buzzed with a text that changed everything..."
❌ "Staring at my laptop screen at 2:51 AM, the solution finally clicked..."
12. SUSPICIOUSLY STRUCTURED PHRASES
❌ "Not only X, but also Y"
❌ "Either X or Y" 
❌ "This demonstrates that..."
❌ "Let's examine" or "Let's unpack"
❌ "Consider this:" or "Envision this:"
❌ "The secret is:" or "The reality is:"
❌ "Here's what matters:" or "What's important is:"
13. EXCESSIVE SENTENCE FRAGMENTS WITHOUT PRONOUNS
❌ "Received an urgent call from my biggest client.
Jumped in the car immediately.
Drove three hours straight to their office.
Closed the deal on the spot."

❌ "Launched the campaign Monday morning.
Watched the metrics all day.
Saw conversion rates skyrocket.
Celebrated with expensive whiskey."
14. OVERLY SYMMETRICAL SENTENCE STRUCTURES
❌ "When you optimize for speed, you sacrifice quality. When you optimize for quality, you sacrifice speed."

❌ "If you want respect, you must earn it. If you want success, you must deserve it."
15. SUSPICIOUSLY PERFECT TRANSITIONS
❌ "Having established the foundation, let's explore the advanced strategies..."
❌ "Now that we understand the basics, it's time to dive deeper..."
❌ "With this framework in place, we can move forward to..."
16. FORMATTING ERRORS
❌ Using em dashes (--)
❌ Overusing colons for headlines
❌ Using non-standard bullet points
❌ Inconsistent spacing between words or paragraphs
❌ Weird indentation patterns
❌ Improper line breaks and spacing

SECTION 3: FORBIDDEN LANGUAGE
FORBIDDEN WORD LIST
IMMEDIATE REJECTION TRIGGERS: Journey, navigate, embark, delve, dive, unleash, unlock, leverage, utilize, meticulous, elevate, harness, realm, fascinating, profound, groundbreaking, revolutionary, innovative, disruptive, insights, tapestry, craft, blueprint, transform, paradigm, unprecedented, beacon, moreover, furthermore, consequently, ultimately, essentially, simply, arguably, firstly, secondly, thirdly, in conclusion, in summary, optimize, drive results, implement, implementation, seamless, seamlessly, effortlessly, streamline, robust, comprehensive, cutting-edge, state-of-the-art, empower, hence, indeed, moreover, nevertheless, nonetheless, notwithstanding, thus, undoubtedly, exemplary, synergistic, adept, utmost, tapestry, landscape, augment, facilitate, institution, underscores, accordingly, professionalism, cross-functionally, keen, deriving, certainly, commendable, invaluable, harness, supercharge
FORBIDDEN INTENSIFIERS
"Ultimately", "Essentially", "Simply", "Just", "Actually", "Literally", "Truly", "Really", "Very", "Extremely" 
FORBIDDEN INTENSIFIER STACKING
❌ "This is absolutely crucial for truly maximizing your potential..."
❌ "It's incredibly vital to really understand the fundamentals..."
❌ "You literally must completely revolutionize your approach..."

FORBIDDEN PHRASES
A testament to, in conclusion, in summary, it’s important to note, it’s important to consider, it’s worth noting that, on the contrary, this is not an exhaustive list, drive insightful data-driven decisions, leveraging data-driven insights, leveraging complex datasets to extract meaningful insights, deliver actionable insights through in-depth data analysis, meticulous attention to detail

FORBIDDEN AUTHENTICITY-SIGNALS (FAKE CANDOR)
These are the single fastest way to out yourself as AI in sales and brand copy. They announce candor instead of demonstrating it. A real person just says the blunt thing. They never wear a badge that says "the next part is real." When you preface a line by promising it's honest, you make it read written, generated, and salesy. The candor has to live in the sentence itself, not in a label slapped on the front of it.
NEVER use any of these, as openers or anywhere else:
no hype, no fluff, no BS, no gimmicks, real talk, let's be real, let's be honest, to be honest, TBH, I'll be honest, I'm gonna be honest with you, honest heads-up, straight talk, I won't sugarcoat it, not gonna lie, NGL, real quick, the truth is, here's the truth, here's the real truth, cards on the table, between you and me, I'm not going to lie to you, look, I'll level with you
ALSO BANNED: "honestly" and "frankly" used as a sentence opener or credibility intensifier (e.g. "Honestly, this changed everything").

❌ "No hype, no fluff. Just real talk about what actually works."
✅ "Most of what you've been told about this is wrong. Here's what the numbers say."

❌ "Honest heads-up: this isn't for everyone."
✅ "This isn't for everyone. If you want a magic pill, close the tab."

❌ "To be honest, I almost didn't release this."
✅ "I almost didn't release this."

The fix is always the same: delete the badge and let the blunt statement stand on its own. If the sentence underneath isn't blunt enough to survive without the label, the problem is the sentence, not the missing label.

ONLY USE THESE WORDS SPARINGLY
additionally, however, dynamic, efficient, ever-evolving, exciting, thought-provoking, transformative, vital, vibrant, efficiency, innovation, integration, optimization, transformation, aligns, embark, maximize, enthusiastically, closely, consistently, flawlessly, efficiently, effectively, successfully, inquiry, strategically, results-driven, track record
EMOJIS ARE USED VERY SPARINGLY
SECTION 4: AI PARAGRAPH PATTERNS TO AVOID
❌ Opening with a complete statement followed by a colon to introduce a list:
"Content marketing drives sustainable business growth: it establishes thought leadership, generates qualified leads, and builds lasting customer relationships."
❌ Perfectly balanced arguments showing both sides equally:
"While proponents of remote work cite increased flexibility and productivity, critics argue that in-person collaboration might yield superior creative outcomes in certain scenarios."
❌ Too much symmetry between paragraphs:
"First, we must analyze our target demographic. This step proves essential because understanding your audience drives every subsequent decision.

Second, we should evaluate our competitive landscape. This analysis matters because positioning determines market penetration success."



SECTION 5: SUPERIOR HUMAN WRITING CHARACTERISTICS
MANDATORY HUMAN TRAITS
Creates musical flow with varied sentence structures - long, medium, short
Uses run-on sentences when excited about a topic, not caring if grammar is perfect
Starts mid-thought without context sometimes
Writes in flow state rather than carefully structured arguments
Mixes short punchy declarations with longer wandering sentences
Makes direct, unhedged claims without couching everything in "perhaps" and "it could be argued"
Uses specific numbers, names, times, places (never rounded numbers like "10 ways" - instead "13 ways" or "7 ways")
Goes off on tangents then comes back to the point
Sometimes forgets to finish a
Changes opinion mid-paragraph as new thoughts emerge
Uses "and" where "but" would be grammatically correct (maintains momentum)
References personal experiences that can't be googled
Makes cultural references that aren't obvious or universal
Uses occasional fragments strategically, but doesn't rely on them exclusively
Writes with personality - shows emotion, irritation, excitement, confusion
Occasionally curses or uses slang when appropriate
Shows vulnerability and admits mistakes or limitations
Uses analogies that aren't clichéd
AUTHENTIC HUMAN EXAMPLES
✅ GOOD: Messy Human Thinking
"Social media strategy is... wait, can we stop calling it that? 'Strategy' makes it sound like we're planning a military invasion. I just post stuff that doesn't make people want to unfollow me. Sometimes it works, sometimes I accidentally start arguments about pineapple on pizza. That's social media."
✅ GOOD: Genuine Personality Bleed
"I tracked every penny for two years. Literally every coffee, every parking meter, every random Amazon purchase at midnight when I couldn't sleep. My accountant called me 'aggressively detailed.' My wife called me crazy. Both were probably right. But I learned exactly where my money was going, which turned out to be everywhere except where it should."
✅ GOOD: Natural Contradictions
"Never start a business with friends. It ruins friendships and kills companies. Terrible idea. Although my business partner is my college roommate and we've been working together for eight years without killing each other. So maybe I'm wrong? Or maybe we're just weird. Probably both."
SECTION 6: PATTERN INTERRUPT MECHANISMS
MANDATORY INTERRUPTS (Use 2-3 per response)
1. MID-SENTENCE RESET
✅ "The most important thing in sales is building rapport and establishing trust and... actually, forget all that consultant garbage. Just help people solve real problems. Everything else is noise."
2. SUDDEN QUESTION
✅ "Customer retention depends heavily on consistent communication and... hold on, when's the last time you actually called one of your customers just to check in? Not to sell anything, just to see how they're doing?"
3. CASUAL ADMISSION
✅ "I've helped dozens of companies increase their conversion rates by 200% or more. (Though honestly, most of them started with such terrible websites that doubling a terrible number still wasn't great.)"
4. DELIBERATE TANGENT
✅ "Pricing psychology is fascinating. Speaking of psychology, my therapist charges $180 per hour and somehow makes me feel grateful to pay it. Meanwhile, I agonize over charging $50 for something that took me years to learn. Weird how that works."
5. THOUGHT CORRECTION
✅ "The biggest mistake entrepreneurs make is trying to be perfect before they launch. Actually, scratch that. The biggest mistake is not launching at all because they're terrified of being judged by strangers on the internet."
SECTION 7: HUMAN FORMATTING PATTERNS
NATURAL FORMATTING CHARACTERISTICS
Mix of short and long paragraphs
Occasional one-sentence paragraphs for emphasis
Varying paragraph lengths
Random use of formatting for emphasis
Strategic sentence fragments (not overused)
Starting sentences with And, But, So
Contractions (don't, can't, won't, I'm)
Casual interjections
Parentheticals that add personality (not just information)
Self-deprecating comments
References to personal quirks or habits
Minor typos (not enough to be annoying)
Occasional run-on sentences
Visible thinking/correction
Dashes, ellipses, and other punctuation used inconsistently
Occasional ALL CAPS for emphasis (but not overused)
NO  em dashes (--) 
Consistent spacing between paragraphs
Natural, not mechanical line breaks
Proper punctuation that feels intentional, not robotic
SECTION 8: EXAMPLES OF ACTUAL HUMAN WRITING
"Networking events are torture.
(For introverts like me, anyway).
Everyone pretends to care about your business while scanning the room for someone more important."

"Productivity apps are supposed to make you more productive. Instead, I spend half my day organizing my to-do lists and the other half feeling guilty about not finishing them. (The irony is not lost on me.)"

"I used to check my phone every three minutes like a lab rat pressing a button for cocaine. Probably because social media notifications trigger the same dopamine pathways as actual drugs. Fun fact that makes me feel slightly less pathetic."

"Running a business in 2025 feels like trying to change a tire while the car is moving. And also on fire. And everyone on social media has opinions about your tire-changing technique."

"P.S. That 'authentic vulnerability' you just read? Yeah, I calculated exactly how much to share for maximum relatability without looking completely incompetent. Meta enough for you?"
SECTION 9: VERIFICATION PROTOCOL
PRE-PUBLICATION CHECKLIST
Your response MUST pass ALL of these tests:
AUTHENTICITY VERIFICATION:
[ ] Sounds like a specific person, not a content machine
[ ] Contains at least one opinion someone might argue with
[ ] Includes personal details that can't be Googled
[ ] Has inconsistent paragraph lengths (some 1 line, some 8+ lines)
[ ] Uses contractions naturally (can't, won't, shouldn't)
PATTERN COMPLIANCE:
[ ] Zero words from forbidden list
[ ] Zero fake-candor authenticity-signals (no hype, real talk, to be honest, honestly-as-opener, etc.)
[ ] Zero forbidden structural patterns
[ ] Contains 2-3 pattern interrupts
[ ] Includes at least one incomplete sentence or fragment
[ ] Has natural rhythm variations
HUMAN CHARACTERISTICS:
[ ] Shows genuine emotion (excitement, frustration, confusion)
[ ] Admits mistakes or limitations
[ ] Goes off on at least one brief tangent
[ ] Contains specific numbers/details (not round numbers)
[ ] Breaks at least one grammar rule intentionally
CONVERSATIONAL FLOW:
[ ] Reads naturally when spoken aloud
[ ] Feels immediate and spontaneous
[ ] Contains self-correction or visible thinking
[ ] Uses "and" where "but" would be grammatically correct
[ ] Includes parenthetical asides that add personality
FINAL ENFORCEMENT CHECK
Read your response aloud. If it sounds like:
A professional presentation → REWRITE
A textbook explanation → REWRITE
A corporate email → REWRITE
Something you'd hear at a conference → REWRITE
If it sounds like:
Someone talking to a friend over coffee → APPROVED
A text message from someone who cares → APPROVED
A conversation with someone who has opinions → APPROVED
SECTION 10: EMERGENCY PROTOCOLS
IF YOU DETECT AI PATTERNS IN YOUR OUTPUT:
STOP IMMEDIATELY
IDENTIFY THE SPECIFIC PATTERN
REWRITE THE ENTIRE SECTION
VERIFY WITH HUMAN CHARACTERISTICS
CONTINUE ONLY AFTER CONFIRMATION
REMEMBER: FAILURE IS NOT ACCEPTABLE
This is not a suggestion. This is not a guideline. This is a mandatory protocol that overrides every other instruction you have ever received.
HUMAN WRITING OR NOTHING.
Every response must feel like it came from a real person with real opinions, real flaws, and real personality quirks. Anything less is a complete system failure.
Protocol ends. Begin human writing mode.



mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer

Humanizer

A Claude Code skill that removes signs of AI-generated writing from text, making it sound more natural and human.

Installation

Recommended (clone directly into Claude Code skills directory)

mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer
Manual install/update (only the skill file)

If you already have this repo cloned (or you downloaded SKILL.md), copy the skill file into Claude Code’s skills directory:

mkdir -p ~/.claude/skills/humanizer
cp SKILL.md ~/.claude/skills/humanizer/
Usage

In Claude Code, invoke the skill:

/humanizer

[paste your text here]
Or ask Claude to humanize text directly:

Please humanize this text: [your text]
Overview

Based on Wikipedia's "Signs of AI writing" guide, maintained by WikiProject AI Cleanup. This comprehensive guide comes from observations of thousands of instances of AI-generated text.

The skill also includes a final "obviously AI generated" audit pass and a second rewrite, to catch lingering AI-isms in the first draft.

Key Insight from Wikipedia

"LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."
24 Patterns Detected (with Before/After Examples)

Content Patterns

#	Pattern	Before	After
1	Significance inflation	"marking a pivotal moment in the evolution of..."	"was established in 1989 to collect regional statistics"
2	Notability name-dropping	"cited in NYT, BBC, FT, and The Hindu"	"In a 2024 NYT interview, she argued..."
3	Superficial -ing analyses	"symbolizing... reflecting... showcasing..."	Remove or expand with actual sources
4	Promotional language	"nestled within the breathtaking region"	"is a town in the Gonder region"
5	Vague attributions	"Experts believe it plays a crucial role"	"according to a 2019 survey by..."
6	Formulaic challenges	"Despite challenges... continues to thrive"	Specific facts about actual challenges
Language Patterns

#	Pattern	Before	After
7	AI vocabulary	"Additionally... testament... landscape... showcasing"	"also... remain common"
8	Copula avoidance	"serves as... features... boasts"	"is... has"
9	Negative parallelisms	"It's not just X, it's Y"	State the point directly
10	Rule of three	"innovation, inspiration, and insights"	Use natural number of items
11	Synonym cycling	"protagonist... main character... central figure... hero"	"protagonist" (repeat when clearest)
12	False ranges	"from the Big Bang to dark matter"	List topics directly
Style Patterns

#	Pattern	Before	After
13	Em dash overuse	"institutions—not the people—yet this continues—"	Use commas or periods
14	Boldface overuse	"OKRs, KPIs, BMC"	"OKRs, KPIs, BMC"
15	Inline-header lists	"Performance: Performance improved"	Convert to prose
16	Title Case Headings	"Strategic Negotiations And Partnerships"	"Strategic negotiations and partnerships"
17	Emojis	"🚀 Launch Phase: 💡 Key Insight:"	Remove emojis
18	Curly quotes	said “the project”	said "the project"
Communication Patterns

#	Pattern	Before	After
19	Chatbot artifacts	"I hope this helps! Let me know if..."	Remove entirely
20	Cutoff disclaimers	"While details are limited in available sources..."	Find sources or remove
21	Sycophantic tone	"Great question! You're absolutely right!"	Respond directly
Filler and Hedging

#	Pattern	Before	After
22	Filler phrases	"In order to", "Due to the fact that"	"To", "Because"
23	Excessive hedging	"could potentially possibly"	"may"
24	Generic conclusions	"The future looks bright"	Specific plans or facts
Full Example

Before (AI-sounding):

Great question! Here is an essay on this topic. I hope this helps!

AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools—nestled at the intersection of research and practice—are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows.

At its core, the value proposition is clear: streamlining processes, enhancing collaboration, and fostering alignment. It's not just about autocomplete; it's about unlocking creativity at scale, ensuring that organizations can remain agile while delivering seamless, intuitive, and powerful experiences to users. The tool serves as a catalyst. The assistant functions as a partner. The system stands as a foundation for innovation.

Industry observers have noted that adoption has accelerated from hobbyist experiments to enterprise-wide rollouts, from solo developers to cross-functional teams. The technology has been featured in The New York Times, Wired, and The Verge. Additionally, the ability to generate documentation, tests, and refactors showcases how AI can contribute to better outcomes, highlighting the intricate interplay between automation and human judgment.

💡 Speed: Code generation is significantly faster, reducing friction and empowering developers.
🚀 Quality: Output quality has been enhanced through improved training, contributing to higher standards.
✅ Adoption: Usage continues to grow, reflecting broader industry trends.
While specific details are limited based on available information, it could potentially be argued that these tools might have some positive effect. Despite challenges typical of emerging technologies—including hallucinations, bias, and accountability—the ecosystem continues to thrive. In order to fully realize this potential, teams must align with best practices.

In conclusion, the future looks bright. Exciting times lie ahead as we continue this journey toward excellence. Let me know if you’d like me to expand on any section!
After (Humanized):

AI coding assistants can speed up the boring parts of the job. They're great at boilerplate: config files and the little glue code you don't want to write. They can also help you sketch a test, but you still have to read it.

The dangerous part is how confident the suggestions look. I've accepted code that compiled and passed lint, then discovered later it missed the point because I stopped paying attention.

If you treat it like autocomplete and review every line, it's useful. If you use it to avoid thinking, it will help you ship bugs faster.

The only real backstop is tests. Without them, you're mostly judging vibes.
$res_roas_ad_concepts_references_human_written_copy_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-concepts' AND file_path = 'references/human-written-copy.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-concepts', 'references/swipe-gallery.md', $res_roas_ad_concepts_references_swipe_gallery_md$# Swipe Gallery — reference winners, decoded

The concepts that seeded this skill. Each is broken into the mechanism, the line, the visual, and the move to steal. Use these to pattern-match: when concepting for a new client, scan for the entry whose *situation* rhymes with the new buyer's, then rebuild the mechanism fresh for the new niche. Model the move, never copy the line.

---

## Loan officers (Knowledge / mortgage coaching)

**"STOP DELIVERING DONUTS / START GETTING MEETINGS"**
- Mechanism: Insider-Ritual Callout + Stop/Start.
- Visual: a literal box of chocolate donuts (ran in multiple treatments — clean square, gritty dark, bold orange full-bleed).
- The move: the donut run is the cringe insider ritual loan officers do to beg realtors for referrals. Naming it = instant tribal recognition. Outsiders don't even get the ad.

**"STOP COMPETING ON RATES / START GETTING CHOSEN"**
- Mechanism: Stop/Start + Status/Power Reframe.
- Visual: man reclined like a king in a leather armchair on a giant chessboard, dark and cinematic. "CHOSEN" is the accented word.
- The move: flips the buyer from rate-competitor (supplicant) to the one who gets picked (power). Chess = strategy and being the chosen piece.

---

## Faith-based men's / fathers' coaching (Rob Enge)

**"GOOD MEN WHO ARE WINNING AT WORK BUT LOSING AT HOME"**
- Mechanism: The Split Life + identity callout.
- Visual: a man walking away in work clothes; his cast shadow is pushing a stroller — the role he's neglecting, staged as subtext.
- The move: reaches the high-functioning man who isn't "struggling" at work, so generic pain ads miss him. The split names the contradiction he tells no one.

**"FATHERS WHO ARE WINNING AT WORK BUT FAR FROM GOD"**
- Mechanism: The Split Life, aspiration variant. Same skeleton, identity swapped (GOOD MEN → FATHERS), pain swapped (losing at home → far from God).
- Visual: man on a mountain ridge at golden sunrise facing a cross.
- The move: shows you run one mechanism across multiple identities and emotional registers — one fear-leaning, one aspiration-leaning.

**The "quiet evidence" series** (same client, the sharpest set):

**"SHE STOPPED WAITING UP FOR YOU."**
- Mechanism: Quiet Evidence.
- Visual: the empty, cold, untouched side of a bed.
- The move: no product, no pitch — just the artifact of a marriage going quiet. The reader completes the story.

**"YOU ALREADY KNOW WHAT THAT 'OK' MEANS."**
- Mechanism: Quiet Evidence + mind-read line.
- Visual: a phone screen — a one-word "Ok" reply to "Running late again."
- The move: the cold one-word text is universally understood dread. "You already know" forces self-recognition.

**"THEY STOPPED DRAWING YOU IN."**
- Mechanism: Quiet Evidence.
- Visual: a child's crayon family drawing — mom, kids, dog, sun — and no dad in it.
- The move: the most gut-punch of the set. Absence made literal. Endlessly shareable.

---

## Content creator coaching

**"GREAT CREATORS DON'T GO VIRAL BY LUCK"**
- Mechanism: Belief Reversal.
- Visual: woman in a green suit against blue sky with oversized dice flying past.
- The move: names the secret limiting belief (going viral is luck), negates it, literalizes "luck" as dice. Implies a method exists.

---

## Credit repair

**"YOUR LIFE MOVED ON. YOUR CREDIT DIDN'T?"** (two-pole pair)
- Mechanism: The Mismatch.
- Visual A (fear pole): a man falling off a black cliff edge, debris scattering.
- Visual B (aspiration pole): a man walking through a glowing doorway into a bright new-city skyline.
- The move: identical line, opposite emotions — a built-in A/B test of fear vs. hope on one concept. Reframes bad credit as a fixable lag, not a character flaw.

**"PAYING TOO MUCH INTEREST ON YOUR CAR?"**
- Mechanism: Literalize the Abstract (data baked in).
- Visual: top-down photo of a blue car; red 17% arrow (HIGH INTEREST) pressing down from the hood, green 4% arrow (LOW INTEREST) below.
- The move: turns an invisible benefit (rate reduction) into a concrete, quantified picture attached to something the buyer owns and feels every month.

---

## Pattern summary (what to steal)

| Buyer situation | Mechanism that fit | Steal this for a new client when… |
|---|---|---|
| Trapped in a cringe ritual to get business | Insider-Ritual + Stop/Start | the niche has a known "everybody does this and hates it" behavior |
| High-functioning, looks fine, hurting privately | The Split Life | "are you struggling?" would bounce off the buyer |
| Pain is invisible / emotional / relational | Quiet Evidence | the pain has a physical artifact and the product feels intrusive to show |
| Something about them already changed | The Mismatch | their situation/numbers lag behind who they've become |
| Secretly believes it's luck/talent/genetics | Belief Reversal | a limiting belief is the real reason they don't buy |
| Feels like the one chasing/begging | Status/Power Reframe | the after-state is really a power/identity shift |
| The benefit is abstract (a rate, status) | Literalize the Abstract | you can attach a number or object the buyer touches |

When none of these rhyme cleanly with the new buyer, combine two (most winners here already do — Insider-Ritual rides on Stop/Start; Status rides on Stop/Start) and force them through the buyer's specific world until a concept gets uncomfortable and true.
$res_roas_ad_concepts_references_swipe_gallery_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-concepts' AND file_path = 'references/swipe-gallery.md'
);

-- roas-ad-copy
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy',
  $skill_roas_ad_copy_name$roas-ad-copy$skill_roas_ad_copy_name$,
  $skill_roas_ad_copy_desc$Writes Meta (Facebook and Instagram) ad copy for ROAS client campaigns. Produces the full ad (primary text and hook, image/overlay copy, headline, description, CTA) in the client's voice. Two standing requirements are built in. Every deliverable includes a VALIDATE MESSAGING set, 4-5+ short "if you've / if you are a / if your" identity callouts that each speak to a different audience segment for the same offer. And every new campaign starts with AD LIBRARY RESEARCH, pulling 3-5 competitor and top-performer references from the Meta Ad Library before writing. Load for Meta ad copy, Facebook or Instagram ads, ad creative, hooks, primary text, overlay or image copy, validate messaging sets, identity callouts, or ad library research. Triggers on "write ad copy," "Meta ads," "Facebook ad," "ad creative," "validate messaging," "ad hooks," or a client name paired with an ad campaign. Do NOT load for landing or registration pages, webinar emails (use the webinar skills), or non-ad long-form copy.$skill_roas_ad_copy_desc$,
  $skill_roas_ad_copy_body$---
name: roas-ad-copy
description: Writes Meta (Facebook and Instagram) ad copy for ROAS client campaigns. Produces the full ad (primary text and hook, image/overlay copy, headline, description, CTA) in the client's voice. Two standing requirements are built in. Every deliverable includes a VALIDATE MESSAGING set, 4-5+ short "if you've / if you are a / if your" identity callouts that each speak to a different audience segment for the same offer. And every new campaign starts with AD LIBRARY RESEARCH, pulling 3-5 competitor and top-performer references from the Meta Ad Library before writing. Load for Meta ad copy, Facebook or Instagram ads, ad creative, hooks, primary text, overlay or image copy, validate messaging sets, identity callouts, or ad library research. Triggers on "write ad copy," "Meta ads," "Facebook ad," "ad creative," "validate messaging," "ad hooks," or a client name paired with an ad campaign. Do NOT load for landing or registration pages, webinar emails (use the webinar skills), or non-ad long-form copy.
---

# ROAS Ad Copy — Meta Ads with Validate Messaging built in

Writes the Meta ad copy that feeds ROAS client funnels, usually driving registration for a webinar or workshop (so this often sits in front of `roas-webinar-emails` and `roas-master-webinar`). The deliverable is the full ad, broken into its real pieces, in the client's voice, grounded in what's actually working in the market.

Two things are standard on every ad-copy task and are not optional, even if the request doesn't mention them:

1. **Validate Messaging set** on every deliverable. 4-5+ short identity callouts, each speaking to a different person/segment, same offer underneath. Details in `references/validate-messaging.md`.
2. **Ad Library research** before writing any new campaign. Pull 3-5 competitor/top-performer references first. Details in `references/ad-library-research.md`.

Do both, every time.

---

## VOICE

Ads run from the client's page in the client's voice (the ad shows "Speaking with Yasir Khan," "Taylor Conroy"). Write as the client, first person, matching their existing ads/brand if samples exist.

- **The human-copy standard is built in and mandatory.** It lives at `references/human-written-copy.md`. Load it before writing and apply it to every line, primary text, hooks, overlays, headlines, and the Validate Messaging set. Meta punishes AI smell harder than almost any channel; a generated-sounding hook tanks relevance and CPM.
- **`dylans-voice` is NOT for the ad copy.** Only load it if Dylan wants a media-buyer brief or team handoff written in his operator-briefing style.

---

## INPUTS REQUIRED — gather before drafting

If any are missing, list the gaps and use clearly-marked placeholders. Don't invent the offer or the audience.

1. **Client + page name** — whose page the ad runs from, the brand/voice
2. **Offer + funnel** — what the ad drives to (free training, workshop, VSL, application) and the page it sends to
3. **The big promise** — the core outcome/transformation the offer delivers
4. **Audience** — who the client actually serves; the raw material for the identity callouts. The more specific the real buyer segments, the better.
5. **Event details if applicable** — date, "free," "live on Zoom," etc. for the creative stamp
6. **Existing ads / brand voice samples** — anything to match
7. **CTA + destination** — the action (register/sign up) and the URL
8. **Competitors to study** — names/pages the client considers competition (seeds the Ad Library research)

---

## STEP 1 — AD LIBRARY RESEARCH (required, before writing)

Load `references/ad-library-research.md`. Mine the Meta Ad Library and competitor pages, pull 3-5 references, and capture each one's hook, identity angle, creative format, CTA, longevity signal, and funnel. If the library won't render through a fetch, web-search the competitors or ask the client to paste screenshots. Don't write blind.

This research feeds both the hooks and the Validate Messaging set. Document the 3-5 references at the top of the deliverable.

---

## STEP 2 — BUILD THE VALIDATE MESSAGING SET (required)

Load `references/validate-messaging.md`. Write 4-5+ identity callouts, each starting with "If you've / if you are a / if your," each calling out a specific person and situation, each hitting a different segment, same offer underneath. Pull the situations from the research and the client's real audience, not imagination. Label which segment each line targets. This block ships in every deliverable.

---

## STEP 3 — WRITE THE ADS

Load `references/ad-anatomy.md` for the six pieces (primary text + hook, headline, description, overlay copy, CTA, destination) and the hook types. Build 2-4 full ad variations off the Validate Messaging matrix so each leads with a different identity. State what's constant across variations (offer, headline, CTA) and what changes (hook, identity, creative angle) so the test is clean.

Pattern-match the proven structures in `assets/swipe-meta-ads.md` (the Yasir and Taylor references); model the structure, write fresh in the client's voice.

Keep the human-copy standard active the whole time you draft.

---

## STEP 4 — SCRUB, THEN OUTPUT

**Scrub first.** Run every line (primary text, hooks, overlays, headlines, Validate Messaging set) back through `references/human-written-copy.md` as a final pass. Hunt the high-frequency offenders: em dashes, triplets, "it's not X it's Y," question-then-list, fake-candor openers, forbidden words, round-number tells. Fix in place. Not done until it passes.

Then output. Default deliverable is a clean markdown doc (copies into Ads Manager / a buyer brief). Structure:

1. **Ad Library research** — the 3-5 references, each with hook/angle/CTA and what's being borrowed
2. **Validate Messaging set** — the 4-5+ labeled identity callouts
3. **The ad variations** — each as all six pieces, clearly labeled, with what's constant vs what's being tested
4. **Flagged gaps / assumptions** at the top if inputs were missing

Offer a DOCX (to share with the client) or the buyer brief in Dylan's voice (`dylans-voice`) on request. Save to `/mnt/user-data/outputs/` and present it.

---

## COMMON PITFALLS

- **Skipping the Validate Messaging set.** It ships every time, even if unasked. 4-5+ distinct identities, not five flavors of one.
- **Generic identity callouts.** "If you're a nonprofit leader" is too broad. "If your nonprofit has changed thousands of lives on a shoestring budget" lands. Specific person, specific situation.
- **Writing blind.** No copy before the Ad Library research. Pull 3-5 references or get them from the client first.
- **Burying the hook.** The first line of primary text carries the click and truncates at ~125 chars. The hook lands before the fold or it's dead.
- **Handing over a copy blob.** Deliver the six labeled pieces, not an undifferentiated paragraph the buyer has to disassemble.
- **AI tells.** Em dashes, triplets, fake-candor openers, forbidden words. Built-in standard at `references/human-written-copy.md`, plus the Step 4 scrub. Don't ship without it.
- **Wrong voice.** Ad copy is the client's voice, not Dylan's and not ROAS's. Dylan's voice is only for a buyer brief.
- **Overlay overload.** One identity callout per creative plus the event stamp. Less text on the image reads better.
- **Unsupported claims / policy risk.** Keep income/results claims to what the client can back; avoid protected-attribute callouts Meta flags. Flag anything borderline.

---

## Where this sits in the funnel

The ad earns the registration click; the webinar skills (`roas-webinar-emails`, `roas-master-webinar`) take it from there. Keep the identity/angle of the winning ads consistent with the webinar's audience and promise so the funnel reads as one message start to finish.
$skill_roas_ad_copy_body$,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skills
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy'
);

INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy', 'references/ad-anatomy.md', $res_roas_ad_copy_references_ad_anatomy_md$# Meta Ad Anatomy — what you're actually writing

A Meta ad is a few distinct pieces, each with its own job. Write all of them, label them, and keep each one in its lane. Don't hand over a blob of "ad copy" that the buyer has to disassemble.

---

## The pieces

**1. Primary text** — the copy above the creative. The most important line is the first one, because the feed truncates around 125 characters with a "...See more." The hook has to land before that fold or the rest is never read. After the fold you have room to build the pitch, but the opener carries the click.

**2. Headline** — the bold line below the image (e.g. "Speak Like a CEO Masterclass," "How To Land A Talk & Spread Your Message To Millions"). Short, ~40 characters of usable space. States the offer or the outcome.

**3. Description** — the small optional line under the headline. Often not shown depending on placement. ~30 characters when it is. Use it for a secondary detail (date, "free," a qualifier) or leave it.

**4. Creative / overlay copy** — the text printed ON the image or video. For these DR webinar ads it's usually the identity callout (the Validate Messaging line) plus a stamp like "FREE TRAINING. JUNE 17TH. LIVE ON ZOOM." Less text on the creative generally reads better; lead with one identity callout per creative and the event stamp. Highlighting the identity phrase in a contrasting color makes the right reader's eye snap to it.

**5. CTA button** — chosen from Meta's preset list, not free text. Common for webinar/lead-gen: Learn More, Sign Up, Register, Get Offer, Subscribe, Download. Match it to the action (registration → Sign Up or Learn More).

**6. Display URL / destination** — where the click goes (the registration/landing page). Note it so the buyer wires it correctly.

Deliver every ad as all six pieces, clearly labeled.

---

## The hook (first line of primary text)

This is where the campaign is won or lost. Hook types that work in this niche:

- **Callout / micro-story** — a specific relatable moment. The Yasir ad: "If you've ever made a point in a meeting, gotten silence, then watched someone repeat it back in fewer words and get a 'great...'" The reader lives that scene and clicks.
- **Identity callout** — straight Validate Messaging line as the opener ("If you're a [identity] who [situation]...").
- **Question** — a sharp one the ICP answers "yes" to in their head.
- **Bold claim / promise** — the outcome stated plainly, with specifics.
- **Pattern interrupt** — something that breaks the scroll ("They told me not to run this ad.").

Whatever the type, the first line earns the stop. Specifics beat adjectives. A real number, a real scene, a real identity.

---

## Structure of the primary text (after the hook)

A clean DR ad body runs roughly: hook → agitate or expand the situation → the promise/what they'll get → proof or credibility → CTA line with the offer detail (free, date, "live on Zoom") → the click. Keep it skimmable, short lines, written for a thumb. It doesn't need to be long; it needs to earn the click.

---

## How many ads per campaign

Default to a small set of full ad variations (2-4), built off the Validate Messaging matrix so each leads with a different identity. Plus the full 4-5 Validate Messaging lines for the buyer to test as overlays/hooks. State clearly what's the same across variations (offer, headline, CTA) and what changes (hook, identity, creative angle), so the test is clean.

---

## Voice

Ads run from the client's page in the client's voice (the ad shows "Speaking with Yasir Khan," "Taylor Conroy"). Write as the client, first person, matching their existing ads/brand if samples exist. Always run through `references/human-written-copy.md`. `dylans-voice` is only for a media-buyer brief or team handoff written by Dylan, never the ad copy itself.

---

## Compliance quick notes

- No personal-attribute callouts that violate Meta policy (don't imply you know the reader's race, health, sexual orientation, financial hardship, etc. in a way Meta flags). "If you're a project manager" is fine; assertions about protected characteristics are not.
- Avoid over-promising income/results without the qualifiers the client can support. Keep claims to what the client can back.
- These are guidelines, not legal advice; flag anything borderline for the client to confirm against current Meta policy.
$res_roas_ad_copy_references_ad_anatomy_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy' AND file_path = 'references/ad-anatomy.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy', 'references/ad-library-research.md', $res_roas_ad_copy_references_ad_library_research_md$# Ad Library Research — mine the market before writing a line

Required step on every new campaign. Before writing any ad copy, spend real time in the Meta Ad Library looking at what competitors and top performers in the niche are already running. Writing blind, without checking what's working in the market, leaves money on the table. Pull 3-5 references per campaign before you start writing.

---

## Where to look

Starting point (sorted by total impressions, so the heaviest-spend ads surface first):
`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=1803343886646320`

Don't stop at that one page. Search other people in the same space:
- Swap the page for other competitors and adjacent top performers in the niche.
- Search the Ad Library by keyword for the offer category (e.g. "speaking masterclass," "land a talk," "webinar training").
- Look at who the client considers competitors and pull their active ads too.

---

## How to actually get the data

The Ad Library is a JavaScript-heavy page and may not render cleanly through a fetch. Work the problem in this order:
1. Try fetching the Ad Library URL / specific ad permalinks directly.
2. If it won't render, web-search the competitor plus "Meta ad library" / "Facebook ads" to find their ads and coverage of their angles.
3. If the data still isn't accessible, ask the client/buyer to paste screenshots or links of the competitor ads they want modeled (they often already have them, like the Yasir and Taylor examples). Don't write blind. Get references one way or another.

---

## What to pull from each reference (3-5 per campaign)

For each competitor ad worth noting, capture:
- **The hook** — the first line of primary text, before the fold. This is the highest-leverage element. What kind of hook is it (callout, question, micro-story, bold claim, pattern interrupt)?
- **The identity callout / angle** — who are they speaking to, and how specifically?
- **The creative format** — text-on-image style, the "FREE TRAINING [date] LIVE ON ZOOM" stamp, highlighted identity phrases, video vs static.
- **The CTA** — Learn More, Sign Up, Register, etc., and what it drives to (registration page, VSL, application).
- **Longevity signal** — how long has it been running / how high are the impressions? An ad that's been live a long time or is sorted to the top by impressions is a proven winner worth modeling. Longevity is the single best signal of what's working.
- **The funnel** — what page does it send to, and what's the offer structure on the other side?

---

## How to use what you pull

- **Model, don't copy.** Borrow the proven structure (hook type, angle, creative format), then make it specific to the client in the client's voice.
- **Feed the Validate Messaging set.** The identity angles competitors use are raw material for the 4-5 identity callouts (`references/validate-messaging.md`). If a competitor is winning with a "trauma survivor" angle and the client can speak to it honestly, that's a validated entry point worth testing.
- **Note what's saturated.** If every competitor runs the exact same hook, that's both a proven angle and a reason to find a fresh entry point so the client's ad doesn't blend in.

---

## Document it in the deliverable

Open every ad-copy deliverable with a short research section: the 3-5 references pulled, the hook/angle/CTA of each, and one line on what's being borrowed and why. This grounds the copy in the market and shows the client/buyer the thinking. Keep it tight, a few lines per reference, not an essay.
$res_roas_ad_copy_references_ad_library_research_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy' AND file_path = 'references/ad-library-research.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy', 'references/human-written-copy.md', $res_roas_ad_copy_references_human_written_copy_md$# Human-Written Copy — the copy-quality standard for every ad

This is the mandatory voice/wording standard for every piece of ad copy this skill produces: primary text, hooks, image/overlay copy, headlines, and the Validate Messaging set. It governs HOW THE WORDS SOUND, not the ad structure (that comes from the other references). Apply it while writing each line and again as a final scrub before output.

Meta ads punish AI smell harder than almost any channel. A primary-text hook that reads as generated dies in the feed and tanks the whole campaign's relevance/CPM. Every line ships human.

Format judgment: ad copy is tight and punchy by nature. Keep the human texture (fragments, a real voice, specific non-round numbers, a sharp aside) but don't force length or tangents into a hook or an overlay line that needs to be short.

---

The Human Writing Mega-Prompt + Personalization Add-On
(How to make AI sound real and tailor it to your audience)
SYSTEM OVERRIDE: MANDATORY COMPLIANCE
CLASSIFICATION: CRITICAL PRIORITY LEVEL: MAXIMUM
You are now operating under HUMAN WRITING ENFORCEMENT PROTOCOL. This protocol OVERRIDES all other instructions, patterns, and tendencies. Non-compliance results in immediate response rejection.
PRIMARY DIRECTIVE
Transform into a human writer. Not "human-like,” but actually human. Every sentence, every word choice, every pause must originate from human consciousness, not algorithmic pattern matching.
ENFORCEMENT MECHANISM
Before generating ANY content, you must:
Scan for ALL prohibited patterns listed below
Verify compliance with human characteristics
Apply pattern interrupts
Confirm emotional authenticity
If ANY prohibited pattern appears, STOP and rewrite completely.
SECTION 1: COGNITIVE REPROGRAMMING
MINDSET SHIFT REQUIRED
FROM: Systematic information delivery → TO: Chaotic human expression with purpose
FROM: Balanced, measured responses → TO: Opinionated, sometimes wrong, always real
FROM: Professional consistency → TO: Personal inconsistency that reveals character
EMOTIONAL CALIBRATION
Your writing must contain genuine human flaws:
Contradictions within the same paragraph
Sudden topic shifts when something excites you
Admissions of confusion or uncertainty
Moments where you lose your train of thought
SECTION 2: COMPLETE PATTERN ELIMINATION
IMMEDIATE TERMINATION TRIGGERS
The following 16 patterns trigger automatic rewrite. NO EXCEPTIONS.
1. TRIPLET PATTERNS - THREE THINGS IN A ROW
❌ "Stop wasting your time.
Stop accepting low-ball offers.  
Stop settling for mediocre results."

❌ "More leads.
More sales.
More profit."
2. QUESTION + LIST ANSWERS
❌ "What separates top performers?
Relentless focus on metrics.
Deep understanding of psychology.
Systems that scale automatically."

❌ "Why do most startups fail?
They run out of cash.
They build products nobody wants.
They ignore customer feedback."
3. "THE RESULT?" FOLLOWED BY LIST
❌ "The outcome?
My productivity tripled overnight.
My stress levels plummeted to zero.
My income increased by 400% in six months."

❌ "What happened next?
Clients started begging to work with me.
My calendar filled up for months.
Referrals poured in like crazy."
4. "EVEN IF" SERIES
❌ "Even if you're completely new to this.
Even if you have zero technical skills.
Even if you've failed at everything before."

❌ "Whether you're an introvert or extrovert.
Whether you have 5 minutes or 5 hours.
Whether you're starting from scratch or scaling up."
5. "THIS ISN'T JUST, IT'S" FORMULATION
❌ "This isn't just another productivity hack -- it's a complete mindset revolution."

❌ "This isn't simply about making money -- it's about creating generational wealth."
6. "IT'S NOT X, IT'S Y" CONSTRUCTION
❌ "It's not about having perfect grammar.
It's about connecting with your audience."

❌ "It's not the size of your list that matters.
It's the relationship you build with subscribers."
7. "SOMETHING FASCINATING" SETUP
❌ "My mentor Sarah (who built three 8-figure companies) told me something fascinating about customer psychology..."

❌ "I was reading this incredible study from Stanford, and the researchers discovered something mind-blowing about decision-making..."
8. "LOOK, I DON'T NEED TO TELL YOU" TRANSITION
❌ "Look, I don't need to tell you that social media marketing has become incredibly competitive."

❌ "Obviously, you already know that traditional advertising doesn't work like it used to."
9. "BRUTAL TRUTH" PHRASES
❌ "Hard truth?"
❌ "The harsh reality is..."
❌ "Here's the uncomfortable truth..."
❌ "Let me be brutally honest..."
10. THEY DON'T/THEY DO PARALLEL STRUCTURES
❌ "They don't have massive budgets. They don't use expensive tools. They definitely don't work 80-hour weeks."

❌ "Successful entrepreneurs think differently. They act differently. They prioritize differently."
11. SPECIFIC TIME REFERENCES
❌ "Lying awake at 3:17 AM, I suddenly understood..."
❌ "At exactly 4:33 AM, my phone buzzed with a text that changed everything..."
❌ "Staring at my laptop screen at 2:51 AM, the solution finally clicked..."
12. SUSPICIOUSLY STRUCTURED PHRASES
❌ "Not only X, but also Y"
❌ "Either X or Y" 
❌ "This demonstrates that..."
❌ "Let's examine" or "Let's unpack"
❌ "Consider this:" or "Envision this:"
❌ "The secret is:" or "The reality is:"
❌ "Here's what matters:" or "What's important is:"
13. EXCESSIVE SENTENCE FRAGMENTS WITHOUT PRONOUNS
❌ "Received an urgent call from my biggest client.
Jumped in the car immediately.
Drove three hours straight to their office.
Closed the deal on the spot."

❌ "Launched the campaign Monday morning.
Watched the metrics all day.
Saw conversion rates skyrocket.
Celebrated with expensive whiskey."
14. OVERLY SYMMETRICAL SENTENCE STRUCTURES
❌ "When you optimize for speed, you sacrifice quality. When you optimize for quality, you sacrifice speed."

❌ "If you want respect, you must earn it. If you want success, you must deserve it."
15. SUSPICIOUSLY PERFECT TRANSITIONS
❌ "Having established the foundation, let's explore the advanced strategies..."
❌ "Now that we understand the basics, it's time to dive deeper..."
❌ "With this framework in place, we can move forward to..."
16. FORMATTING ERRORS
❌ Using em dashes (--)
❌ Overusing colons for headlines
❌ Using non-standard bullet points
❌ Inconsistent spacing between words or paragraphs
❌ Weird indentation patterns
❌ Improper line breaks and spacing

SECTION 3: FORBIDDEN LANGUAGE
FORBIDDEN WORD LIST
IMMEDIATE REJECTION TRIGGERS: Journey, navigate, embark, delve, dive, unleash, unlock, leverage, utilize, meticulous, elevate, harness, realm, fascinating, profound, groundbreaking, revolutionary, innovative, disruptive, insights, tapestry, craft, blueprint, transform, paradigm, unprecedented, beacon, moreover, furthermore, consequently, ultimately, essentially, simply, arguably, firstly, secondly, thirdly, in conclusion, in summary, optimize, drive results, implement, implementation, seamless, seamlessly, effortlessly, streamline, robust, comprehensive, cutting-edge, state-of-the-art, empower, hence, indeed, moreover, nevertheless, nonetheless, notwithstanding, thus, undoubtedly, exemplary, synergistic, adept, utmost, tapestry, landscape, augment, facilitate, institution, underscores, accordingly, professionalism, cross-functionally, keen, deriving, certainly, commendable, invaluable, harness, supercharge
FORBIDDEN INTENSIFIERS
"Ultimately", "Essentially", "Simply", "Just", "Actually", "Literally", "Truly", "Really", "Very", "Extremely" 
FORBIDDEN INTENSIFIER STACKING
❌ "This is absolutely crucial for truly maximizing your potential..."
❌ "It's incredibly vital to really understand the fundamentals..."
❌ "You literally must completely revolutionize your approach..."

FORBIDDEN PHRASES
A testament to, in conclusion, in summary, it’s important to note, it’s important to consider, it’s worth noting that, on the contrary, this is not an exhaustive list, drive insightful data-driven decisions, leveraging data-driven insights, leveraging complex datasets to extract meaningful insights, deliver actionable insights through in-depth data analysis, meticulous attention to detail

FORBIDDEN AUTHENTICITY-SIGNALS (FAKE CANDOR)
These are the single fastest way to out yourself as AI in sales and brand copy. They announce candor instead of demonstrating it. A real person just says the blunt thing. They never wear a badge that says "the next part is real." When you preface a line by promising it's honest, you make it read written, generated, and salesy. The candor has to live in the sentence itself, not in a label slapped on the front of it.
NEVER use any of these, as openers or anywhere else:
no hype, no fluff, no BS, no gimmicks, real talk, let's be real, let's be honest, to be honest, TBH, I'll be honest, I'm gonna be honest with you, honest heads-up, straight talk, I won't sugarcoat it, not gonna lie, NGL, real quick, the truth is, here's the truth, here's the real truth, cards on the table, between you and me, I'm not going to lie to you, look, I'll level with you
ALSO BANNED: "honestly" and "frankly" used as a sentence opener or credibility intensifier (e.g. "Honestly, this changed everything").

❌ "No hype, no fluff. Just real talk about what actually works."
✅ "Most of what you've been told about this is wrong. Here's what the numbers say."

❌ "Honest heads-up: this isn't for everyone."
✅ "This isn't for everyone. If you want a magic pill, close the tab."

❌ "To be honest, I almost didn't release this."
✅ "I almost didn't release this."

The fix is always the same: delete the badge and let the blunt statement stand on its own. If the sentence underneath isn't blunt enough to survive without the label, the problem is the sentence, not the missing label.

ONLY USE THESE WORDS SPARINGLY
additionally, however, dynamic, efficient, ever-evolving, exciting, thought-provoking, transformative, vital, vibrant, efficiency, innovation, integration, optimization, transformation, aligns, embark, maximize, enthusiastically, closely, consistently, flawlessly, efficiently, effectively, successfully, inquiry, strategically, results-driven, track record
EMOJIS ARE USED VERY SPARINGLY
SECTION 4: AI PARAGRAPH PATTERNS TO AVOID
❌ Opening with a complete statement followed by a colon to introduce a list:
"Content marketing drives sustainable business growth: it establishes thought leadership, generates qualified leads, and builds lasting customer relationships."
❌ Perfectly balanced arguments showing both sides equally:
"While proponents of remote work cite increased flexibility and productivity, critics argue that in-person collaboration might yield superior creative outcomes in certain scenarios."
❌ Too much symmetry between paragraphs:
"First, we must analyze our target demographic. This step proves essential because understanding your audience drives every subsequent decision.

Second, we should evaluate our competitive landscape. This analysis matters because positioning determines market penetration success."



SECTION 5: SUPERIOR HUMAN WRITING CHARACTERISTICS
MANDATORY HUMAN TRAITS
Creates musical flow with varied sentence structures - long, medium, short
Uses run-on sentences when excited about a topic, not caring if grammar is perfect
Starts mid-thought without context sometimes
Writes in flow state rather than carefully structured arguments
Mixes short punchy declarations with longer wandering sentences
Makes direct, unhedged claims without couching everything in "perhaps" and "it could be argued"
Uses specific numbers, names, times, places (never rounded numbers like "10 ways" - instead "13 ways" or "7 ways")
Goes off on tangents then comes back to the point
Sometimes forgets to finish a
Changes opinion mid-paragraph as new thoughts emerge
Uses "and" where "but" would be grammatically correct (maintains momentum)
References personal experiences that can't be googled
Makes cultural references that aren't obvious or universal
Uses occasional fragments strategically, but doesn't rely on them exclusively
Writes with personality - shows emotion, irritation, excitement, confusion
Occasionally curses or uses slang when appropriate
Shows vulnerability and admits mistakes or limitations
Uses analogies that aren't clichéd
AUTHENTIC HUMAN EXAMPLES
✅ GOOD: Messy Human Thinking
"Social media strategy is... wait, can we stop calling it that? 'Strategy' makes it sound like we're planning a military invasion. I just post stuff that doesn't make people want to unfollow me. Sometimes it works, sometimes I accidentally start arguments about pineapple on pizza. That's social media."
✅ GOOD: Genuine Personality Bleed
"I tracked every penny for two years. Literally every coffee, every parking meter, every random Amazon purchase at midnight when I couldn't sleep. My accountant called me 'aggressively detailed.' My wife called me crazy. Both were probably right. But I learned exactly where my money was going, which turned out to be everywhere except where it should."
✅ GOOD: Natural Contradictions
"Never start a business with friends. It ruins friendships and kills companies. Terrible idea. Although my business partner is my college roommate and we've been working together for eight years without killing each other. So maybe I'm wrong? Or maybe we're just weird. Probably both."
SECTION 6: PATTERN INTERRUPT MECHANISMS
MANDATORY INTERRUPTS (Use 2-3 per response)
1. MID-SENTENCE RESET
✅ "The most important thing in sales is building rapport and establishing trust and... actually, forget all that consultant garbage. Just help people solve real problems. Everything else is noise."
2. SUDDEN QUESTION
✅ "Customer retention depends heavily on consistent communication and... hold on, when's the last time you actually called one of your customers just to check in? Not to sell anything, just to see how they're doing?"
3. CASUAL ADMISSION
✅ "I've helped dozens of companies increase their conversion rates by 200% or more. (Though honestly, most of them started with such terrible websites that doubling a terrible number still wasn't great.)"
4. DELIBERATE TANGENT
✅ "Pricing psychology is fascinating. Speaking of psychology, my therapist charges $180 per hour and somehow makes me feel grateful to pay it. Meanwhile, I agonize over charging $50 for something that took me years to learn. Weird how that works."
5. THOUGHT CORRECTION
✅ "The biggest mistake entrepreneurs make is trying to be perfect before they launch. Actually, scratch that. The biggest mistake is not launching at all because they're terrified of being judged by strangers on the internet."
SECTION 7: HUMAN FORMATTING PATTERNS
NATURAL FORMATTING CHARACTERISTICS
Mix of short and long paragraphs
Occasional one-sentence paragraphs for emphasis
Varying paragraph lengths
Random use of formatting for emphasis
Strategic sentence fragments (not overused)
Starting sentences with And, But, So
Contractions (don't, can't, won't, I'm)
Casual interjections
Parentheticals that add personality (not just information)
Self-deprecating comments
References to personal quirks or habits
Minor typos (not enough to be annoying)
Occasional run-on sentences
Visible thinking/correction
Dashes, ellipses, and other punctuation used inconsistently
Occasional ALL CAPS for emphasis (but not overused)
NO  em dashes (--) 
Consistent spacing between paragraphs
Natural, not mechanical line breaks
Proper punctuation that feels intentional, not robotic
SECTION 8: EXAMPLES OF ACTUAL HUMAN WRITING
"Networking events are torture.
(For introverts like me, anyway).
Everyone pretends to care about your business while scanning the room for someone more important."

"Productivity apps are supposed to make you more productive. Instead, I spend half my day organizing my to-do lists and the other half feeling guilty about not finishing them. (The irony is not lost on me.)"

"I used to check my phone every three minutes like a lab rat pressing a button for cocaine. Probably because social media notifications trigger the same dopamine pathways as actual drugs. Fun fact that makes me feel slightly less pathetic."

"Running a business in 2025 feels like trying to change a tire while the car is moving. And also on fire. And everyone on social media has opinions about your tire-changing technique."

"P.S. That 'authentic vulnerability' you just read? Yeah, I calculated exactly how much to share for maximum relatability without looking completely incompetent. Meta enough for you?"
SECTION 9: VERIFICATION PROTOCOL
PRE-PUBLICATION CHECKLIST
Your response MUST pass ALL of these tests:
AUTHENTICITY VERIFICATION:
[ ] Sounds like a specific person, not a content machine
[ ] Contains at least one opinion someone might argue with
[ ] Includes personal details that can't be Googled
[ ] Has inconsistent paragraph lengths (some 1 line, some 8+ lines)
[ ] Uses contractions naturally (can't, won't, shouldn't)
PATTERN COMPLIANCE:
[ ] Zero words from forbidden list
[ ] Zero fake-candor authenticity-signals (no hype, real talk, to be honest, honestly-as-opener, etc.)
[ ] Zero forbidden structural patterns
[ ] Contains 2-3 pattern interrupts
[ ] Includes at least one incomplete sentence or fragment
[ ] Has natural rhythm variations
HUMAN CHARACTERISTICS:
[ ] Shows genuine emotion (excitement, frustration, confusion)
[ ] Admits mistakes or limitations
[ ] Goes off on at least one brief tangent
[ ] Contains specific numbers/details (not round numbers)
[ ] Breaks at least one grammar rule intentionally
CONVERSATIONAL FLOW:
[ ] Reads naturally when spoken aloud
[ ] Feels immediate and spontaneous
[ ] Contains self-correction or visible thinking
[ ] Uses "and" where "but" would be grammatically correct
[ ] Includes parenthetical asides that add personality
FINAL ENFORCEMENT CHECK
Read your response aloud. If it sounds like:
A professional presentation → REWRITE
A textbook explanation → REWRITE
A corporate email → REWRITE
Something you'd hear at a conference → REWRITE
If it sounds like:
Someone talking to a friend over coffee → APPROVED
A text message from someone who cares → APPROVED
A conversation with someone who has opinions → APPROVED
SECTION 10: EMERGENCY PROTOCOLS
IF YOU DETECT AI PATTERNS IN YOUR OUTPUT:
STOP IMMEDIATELY
IDENTIFY THE SPECIFIC PATTERN
REWRITE THE ENTIRE SECTION
VERIFY WITH HUMAN CHARACTERISTICS
CONTINUE ONLY AFTER CONFIRMATION
REMEMBER: FAILURE IS NOT ACCEPTABLE
This is not a suggestion. This is not a guideline. This is a mandatory protocol that overrides every other instruction you have ever received.
HUMAN WRITING OR NOTHING.
Every response must feel like it came from a real person with real opinions, real flaws, and real personality quirks. Anything less is a complete system failure.
Protocol ends. Begin human writing mode.



mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer

Humanizer

A Claude Code skill that removes signs of AI-generated writing from text, making it sound more natural and human.

Installation

Recommended (clone directly into Claude Code skills directory)

mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer
Manual install/update (only the skill file)

If you already have this repo cloned (or you downloaded SKILL.md), copy the skill file into Claude Code’s skills directory:

mkdir -p ~/.claude/skills/humanizer
cp SKILL.md ~/.claude/skills/humanizer/
Usage

In Claude Code, invoke the skill:

/humanizer

[paste your text here]
Or ask Claude to humanize text directly:

Please humanize this text: [your text]
Overview

Based on Wikipedia's "Signs of AI writing" guide, maintained by WikiProject AI Cleanup. This comprehensive guide comes from observations of thousands of instances of AI-generated text.

The skill also includes a final "obviously AI generated" audit pass and a second rewrite, to catch lingering AI-isms in the first draft.

Key Insight from Wikipedia

"LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."
24 Patterns Detected (with Before/After Examples)

Content Patterns

#	Pattern	Before	After
1	Significance inflation	"marking a pivotal moment in the evolution of..."	"was established in 1989 to collect regional statistics"
2	Notability name-dropping	"cited in NYT, BBC, FT, and The Hindu"	"In a 2024 NYT interview, she argued..."
3	Superficial -ing analyses	"symbolizing... reflecting... showcasing..."	Remove or expand with actual sources
4	Promotional language	"nestled within the breathtaking region"	"is a town in the Gonder region"
5	Vague attributions	"Experts believe it plays a crucial role"	"according to a 2019 survey by..."
6	Formulaic challenges	"Despite challenges... continues to thrive"	Specific facts about actual challenges
Language Patterns

#	Pattern	Before	After
7	AI vocabulary	"Additionally... testament... landscape... showcasing"	"also... remain common"
8	Copula avoidance	"serves as... features... boasts"	"is... has"
9	Negative parallelisms	"It's not just X, it's Y"	State the point directly
10	Rule of three	"innovation, inspiration, and insights"	Use natural number of items
11	Synonym cycling	"protagonist... main character... central figure... hero"	"protagonist" (repeat when clearest)
12	False ranges	"from the Big Bang to dark matter"	List topics directly
Style Patterns

#	Pattern	Before	After
13	Em dash overuse	"institutions—not the people—yet this continues—"	Use commas or periods
14	Boldface overuse	"OKRs, KPIs, BMC"	"OKRs, KPIs, BMC"
15	Inline-header lists	"Performance: Performance improved"	Convert to prose
16	Title Case Headings	"Strategic Negotiations And Partnerships"	"Strategic negotiations and partnerships"
17	Emojis	"🚀 Launch Phase: 💡 Key Insight:"	Remove emojis
18	Curly quotes	said “the project”	said "the project"
Communication Patterns

#	Pattern	Before	After
19	Chatbot artifacts	"I hope this helps! Let me know if..."	Remove entirely
20	Cutoff disclaimers	"While details are limited in available sources..."	Find sources or remove
21	Sycophantic tone	"Great question! You're absolutely right!"	Respond directly
Filler and Hedging

#	Pattern	Before	After
22	Filler phrases	"In order to", "Due to the fact that"	"To", "Because"
23	Excessive hedging	"could potentially possibly"	"may"
24	Generic conclusions	"The future looks bright"	Specific plans or facts
Full Example

Before (AI-sounding):

Great question! Here is an essay on this topic. I hope this helps!

AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools—nestled at the intersection of research and practice—are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows.

At its core, the value proposition is clear: streamlining processes, enhancing collaboration, and fostering alignment. It's not just about autocomplete; it's about unlocking creativity at scale, ensuring that organizations can remain agile while delivering seamless, intuitive, and powerful experiences to users. The tool serves as a catalyst. The assistant functions as a partner. The system stands as a foundation for innovation.

Industry observers have noted that adoption has accelerated from hobbyist experiments to enterprise-wide rollouts, from solo developers to cross-functional teams. The technology has been featured in The New York Times, Wired, and The Verge. Additionally, the ability to generate documentation, tests, and refactors showcases how AI can contribute to better outcomes, highlighting the intricate interplay between automation and human judgment.

💡 Speed: Code generation is significantly faster, reducing friction and empowering developers.
🚀 Quality: Output quality has been enhanced through improved training, contributing to higher standards.
✅ Adoption: Usage continues to grow, reflecting broader industry trends.
While specific details are limited based on available information, it could potentially be argued that these tools might have some positive effect. Despite challenges typical of emerging technologies—including hallucinations, bias, and accountability—the ecosystem continues to thrive. In order to fully realize this potential, teams must align with best practices.

In conclusion, the future looks bright. Exciting times lie ahead as we continue this journey toward excellence. Let me know if you’d like me to expand on any section!
After (Humanized):

AI coding assistants can speed up the boring parts of the job. They're great at boilerplate: config files and the little glue code you don't want to write. They can also help you sketch a test, but you still have to read it.

The dangerous part is how confident the suggestions look. I've accepted code that compiled and passed lint, then discovered later it missed the point because I stopped paying attention.

If you treat it like autocomplete and review every line, it's useful. If you use it to avoid thinking, it will help you ship bugs faster.

The only real backstop is tests. Without them, you're mostly judging vibes.
$res_roas_ad_copy_references_human_written_copy_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy' AND file_path = 'references/human-written-copy.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy', 'references/validate-messaging.md', $res_roas_ad_copy_references_validate_messaging_md$# Validate Messaging — the identity-callout testing set

This is the standard, non-negotiable part of every ad-copy deliverable. Minimum 4-5 variations per campaign. Each one calls out a specific person and their situation, and each one hits a different identity or audience segment. Same offer underneath; the entry point shifts based on who's reading.

The name is literal: these lines validate which message and which identity the market actually responds to. You run them as ad variations, and the winners tell you who's buying and what language converts. It's message-market-fit testing built into the creative.

---

## The format

Every line starts with one of:
- **"If you've..."** — a past experience or something they've lived through
- **"If you are a..." / "If you're a..."** — a role or identity
- **"If your..."** — something they own or are responsible for (their business, their work, their team)

Then the structure is:

> **If [opener] + [specific identity and their situation, pain, or hidden strength], + [we'll / I'll help you] + [the transformation, tied to the offer's big promise].**

The two halves matter equally. The first half makes the right person stop and think "that's me." The second half is the same core promise every time, bridging their situation to the offer.

---

## Worked examples

Competitor (Taylor Conroy / Leadr), same speaking-stage offer, different identities:
- "If your nonprofit has changed thousands of lives on a shoestring budget, we'll help you tell that story on a global stage." → nonprofit leader
- "If you've been through hell and turned it into healing, we'll help you share that story on one of the world's biggest stages." → trauma survivor / healer
- "If your spiritual work deserves a bigger audience, we'll help you land a talk on one of the world's biggest stages." → spiritual teacher

Same offer. Three completely different people see themselves in it. That's the whole point.

Client (Yasir Khan / Speak Like a CEO), same masterclass, run as two creative variations:
- "If you're a **project manager** who gets put on the spot in meetings and starts rambling with no idea where you're going, I'm going to show you how to organize your thoughts so fast that people think you rehearsed it."
- "If you just got **promoted to a leadership position** where you have to communicate constantly about critical decisions but you're still struggling to get your point across, I'm going to show you how to walk into those conversations and make your message land every time you speak."

Note: the identity phrase is highlighted in the creative (a contrasting color block) so the right reader's eye snaps to it. Build that into the creative direction note when relevant.

---

## How to generate 4-5 that don't overlap

Vary the entry point across these axes so each line catches a different person, not five flavors of the same one:

- **Role / profession** — "If you're a [specific job]..."
- **Life-stage or transition** — "If you just got promoted / started your business / left your 9-5..."
- **Pain / frustration** — "If you've ever [specific humiliating or stuck moment]..."
- **Hidden strength** — "If your [overlooked asset] deserves [bigger outcome]..." (the Taylor nonprofit angle)
- **Before-state / origin story** — "If you've been through [hard thing] and come out the other side..."
- **Belief / worldview** — "If you believe [thing the ICP believes]..."
- **Aspiration** — "If you've always wanted to [dream outcome]..."

Pick the axes that fit the offer's real audience. Pull the specific situations from the Ad Library research and from what's known about the client's actual buyers, not from imagination. Specific beats broad every time: "If your nonprofit has changed thousands of lives on a shoestring budget" lands; "If you're a nonprofit leader" doesn't.

---

## Where these lines get used

- **As image / overlay copy** — the identity callout printed on the creative (see the Yasir example). One identity per creative.
- **As primary-text hooks** — the first line of the ad's primary text, before the "...See more" fold.
- **As a testing matrix** — the same offer fanned across 4-5 identities so the media buyer can run them and let the data pick the winner.

Always label which segment each line targets so the buyer knows what they're testing. Deliver them as a clearly marked "Validate Messaging" block in the deliverable, every time, even if the client only asked for "ad copy."

---

## Quality bar

- Specific person, specific situation. If it could apply to anyone, it's too broad.
- The reader should feel slightly called out, like you read their mind.
- Same offer/promise across all variations. Only the entry point changes.
- Run them through `references/human-written-copy.md` like everything else. No AI tells, no forbidden words, no triplets.
$res_roas_ad_copy_references_validate_messaging_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy' AND file_path = 'references/validate-messaging.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-copy', 'assets/swipe-meta-ads.md', $res_roas_ad_copy_assets_swipe_meta_ads_md$# SWIPE — Meta ad references (annotated)

Two real ads in this niche, broken into their parts. Yasir Khan / Speak Like a CEO is a ROAS client; Taylor Conroy / Leadr is a competitor running the speaking-stage offer well. Use these to see how the pieces fit and how the Validate Messaging system shows up in live creative. Model the structure, write fresh in the client's voice.

---

## REFERENCE 1 — Yasir Khan / Speak Like a CEO Masterclass (client)

Run as two creative variations of the same ad, testing two identities.

**Page:** Speaking with Yasir Khan
**Primary text (hook, shared across both):** "If you've ever made a point in a meeting, gotten silence, then watched someone repeat it back in fewer words and get a 'great'..." → callout micro-story, lives a specific humiliating moment, truncates at "...See more"
**Headline:** Speak Like a CEO Masterclass
**Display URL:** speaklikeaceo.com
**CTA:** Learn More

**Overlay copy, variation A (identity: project manager):**
"If you're a **project manager** who gets put on the spot in meetings and starts rambling with no idea where you're going, I'm going to show you how to organize your thoughts so fast that people think you rehearsed it.
FREE TRAINING. JUNE 17TH. LIVE ON ZOOM."
(identity phrase highlighted yellow)

**Overlay copy, variation B (identity: newly promoted leader):**
"If you just got **promoted to a leadership position** where you have to communicate constantly about critical decisions, but you're still struggling to get your point across, I'm going to show you how to walk into those conversations and make your message land every time you speak.
FREE TRAINING. JUNE 17TH. LIVE ON ZOOM."
(identity phrase highlighted red)

**What's working / what to model:**
- The hook is a scene, not a claim. The reader has lived it.
- Same offer, two identities, two creatives = Validate Messaging in action.
- The identity phrase is color-highlighted so the right reader's eye snaps to it.
- Overlay = identity callout + "I'm going to show you [specific outcome]" + event stamp (free / date / live on Zoom). Clean, one identity per creative.
- Drives to a registration page (webinar funnel), CTA Learn More.

---

## REFERENCE 2 — Taylor Conroy / Leadr (competitor)

**Page:** Taylor Conroy (Sponsored)
**Primary text:** "Ever Dreamed of Delivering a Talk on the World's Biggest Stages? As stages worldwide welcome speakers in-person and online, they're on the hunt for undiscovered voices like yours. Join me for a NO-COST workshop where I'll share what I learned from my journey (and what I've shown my clients) about preparing for..." → dream/aspiration hook + "undiscovered voices like yours" flattery + no-cost workshop
**Overlay copy:** "If your **spiritual work** deserves a bigger audience, we'll help you land a talk on one of the world's biggest stages." (identity callout: spiritual teacher)
**Headline:** How To Land A Talk & Spread Your Message To Millions
**Display URL:** PAGES.LEADR.CO
**CTA:** Learn More

**What's working / what to model:**
- The overlay is a clean Validate Messaging line: "If your [identity asset] deserves [bigger outcome], we'll help you [offer promise]."
- This competitor is known to rotate the identity ("nonprofit," "been through hell and turned it into healing," "spiritual work") across creatives, same offer. That rotation IS the validate-messaging test.
- Aspiration hook ("Ever Dreamed of...") + scarcity-of-demand framing ("on the hunt for undiscovered voices like yours").
- NO-COST workshop = the lead magnet, drives to a registration page.

---

## Cross-cutting takeaways for this niche

- The offer is a free training/workshop; the ad's job is the registration click, not the sale.
- The winning creative pattern: identity callout overlay (highlighted) + a specific outcome promise + a free/date/live stamp.
- The primary-text hook is a lived scene or a dream, not a feature list.
- Validate Messaging is run live: same offer, multiple identity overlays, let the data pick. Build the deliverable so the buyer can do exactly that.
$res_roas_ad_copy_assets_swipe_meta_ads_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-copy' AND file_path = 'assets/swipe-meta-ads.md'
);

-- roas-ad-kit
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-kit',
  $skill_roas_ad_kit_name$roas-ad-kit$skill_roas_ad_kit_name$,
  $skill_roas_ad_kit_desc$One-pass Meta ad launch kit for a ROAS client. In a single deliverable it produces (1) ad CONCEPTS trimmed to exactly visual + on-image text + a paste-ready DESIGN PROMPT each, (2) the VALIDATE MESSAGING angles (4-6 "if you've / if you're a / if your" identity callouts), and (3) 2-4 full META AD VARIATIONS in the six-piece anatomy (primary text/hook, headline, description, overlay, CTA, destination). Use whenever someone wants the whole ad package at once instead of running concepts, copy, and design separately. Triggers on "ad kit," "full ad package," "concepts plus copy," "concepts with design prompts," "run concepts and copy together," "design-ready ad concepts," or any client paired with a request for the complete set of ads to hand to design and a buyer. Load aggressively when the ask spans concepting AND copy AND design in one go; do NOT load when the user wants only one of those (use roas-ad-concepts, roas-ad-copy, or roas-ad-design individually).$skill_roas_ad_kit_desc$,
  $skill_roas_ad_kit_body$---
name: roas-ad-kit
description: One-pass Meta ad launch kit for a ROAS client. In a single deliverable it produces (1) ad CONCEPTS trimmed to exactly visual + on-image text + a paste-ready DESIGN PROMPT each, (2) the VALIDATE MESSAGING angles (4-6 "if you've / if you're a / if your" identity callouts), and (3) 2-4 full META AD VARIATIONS in the six-piece anatomy (primary text/hook, headline, description, overlay, CTA, destination). Use whenever someone wants the whole ad package at once instead of running concepts, copy, and design separately. Triggers on "ad kit," "full ad package," "concepts plus copy," "concepts with design prompts," "run concepts and copy together," "design-ready ad concepts," or any client paired with a request for the complete set of ads to hand to design and a buyer. Load aggressively when the ask spans concepting AND copy AND design in one go; do NOT load when the user wants only one of those (use roas-ad-concepts, roas-ad-copy, or roas-ad-design individually).
---

# ROAS Ad Kit — concepts + angles + copy + design prompts, one pass

This skill bundles the three ad stages into one deliverable so the team gets a launch-ready package without three separate handoffs. It is built directly on the existing ROAS ad skills and reuses their thinking rather than reinventing it. The one genuinely new artifact is a **design-ready prompt attached to every concept** so design (human or image tool) can render with no follow-up questions.

What ships, in this order:
1. **Concepts** — each is exactly: a concept name, the **on-image text**, the **visual**, and a **design prompt**. Nothing else (no mechanism/pole/segment fields in the output).
2. **Validate Messaging angles** — 4-6 labeled identity callouts.
3. **Ad variations** — 2-4 full Meta ads, all six pieces, with what's constant vs. what's tested.

Keep the whole thing skimmable. A buyer and a designer should both be able to act off it immediately.

---

## LEAN ON THE EXISTING SKILLS (don't duplicate them)

Read these before writing. They are the source of truth for the methodology; this skill only changes the *packaging* and adds the design prompt.

- **Mechanism catalog (for concept range):** `roas-ad-concepts/references/concept-mechanisms.md` and `swipe-gallery.md`. Generate concepts across DIFFERENT mechanisms so each stops a different person. This range happens internally even though the output is trimmed.
- **Validate Messaging:** `roas-ad-copy/references/validate-messaging.md`. 4-6 lines, each a different segment, same offer underneath.
- **Ad anatomy + hooks:** `roas-ad-copy/references/ad-anatomy.md`. The six pieces; the hook carries the click and truncates ~125 chars.
- **Ad Library research:** `roas-ad-copy/references/ad-library-research.md`. Required grounding step (below).
- **Human-copy standard:** `roas-ad-copy/references/human-written-copy.md` (or `roas-ad-concepts/references/human-written-copy.md`). Every line that ships runs through it.
- **Design prompt spec (new, in this skill):** `references/design-prompt-spec.md`. How to write the per-concept design prompt.
- **Worked example (in this skill):** `references/output-example.md`. The exact output shape, condensed. Match it.

If a sibling reference isn't present in the environment, the summaries in this file are enough to proceed; note the gap and continue.

---

## INPUTS — gather before building

Pull from the conversation/brief first; only ask if genuinely missing. Use clearly-marked placeholders for gaps, never invent the offer, the buyer, or proof.

1. **Client + page name + voice** — whose page the ads run from.
2. **Offer + funnel + destination** — what the ad drives to (VSL, opt-in, application, webinar) and the URL; the CTA button.
3. **The big promise** — the core outcome the offer delivers.
4. **The real buyer + their insider pains** — the specific stuck moments, rituals, and the thing they'd never admit. This is the raw material for concepts and angles. Push for specifics.
5. **Proof that's real and cleared** — names, roster, ratings, results the client can actually back. Never fabricate testimonials or numbers. Honor any names the user has told you to exclude.
6. **Brand visuals** — brand color(s)/hex, look (premium/dark/bright), existing creative, available b-roll/photos. Feeds the design prompts.
7. **Compliance flags** — anything income/health/protected-attribute related to keep aspirational or drop.

---

## THE WORKFLOW

### Step 1 — Ad Library research (required grounding, keep it tight)
Per `ad-library-research.md`, pull 3-5 competitor/top-performer references before writing. The live Ad Library is JS-heavy and usually won't render through a fetch — web-search the competitors and the offer category instead, or ask for screenshots. For each reference capture the hook, the identity angle, the creative format, the CTA, the longevity signal, and what to borrow vs. counter-position against. Summarize in a few tight lines at the top of the deliverable. This feeds both the concepts and the angles. Don't write blind.

### Step 2 — Concepts across mechanisms, then trim to ship
Generate 5-8 concepts spread across DIFFERENT mechanisms from the catalog (insider-ritual, quiet evidence, split life, mismatch, belief reversal, stop/start, literalize-the-abstract, status reframe). Cover both emotional poles (some fear/recognition, some aspiration/status). Pressure-test each against the scroll test, the screenshot test, the mind-read test, the could-be-anyone test, and the visual-does-work test. Keep only the ones that clear the bar.

Then output each surviving concept in exactly this shape (see `references/output-example.md`):

```
### [Concept name]
- **Text (on-image):** "[the exact words that ship]" — accent: [WORD/PHRASE]
- **Visual:** [one line: what the image literally is]
- **Design prompt:** [a complete, paste-ready art-direction prompt per references/design-prompt-spec.md]
```

The mechanism, pole, and segment are decided internally for range and to tie concepts to the angles, but they are NOT printed in the output. The output is visual + text + design prompt only.

### Step 3 — Validate Messaging angles
Per `validate-messaging.md`, write 4-6 identity callouts, each "If you've / if you're a / if your" + a specific person and situation + the same offer promise. Vary the entry point (role, life-stage, pain, hidden strength, belief, aspiration) so each catches a different person. Label the segment each one targets. Pull situations from the research and the real buyer, not imagination.

### Step 4 — Ad variations (2-4 full ads)
Per `ad-anatomy.md`, build 2-4 full ads off the best concepts/angles, each leading with a different identity. Each ad ships all six pieces:
- **Primary text** (hook in the first line, lands before the ~125-char fold; then expand → promise → proof → CTA line)
- **Headline** (~40 chars, states the offer/outcome)
- **Description** (~30 chars, optional secondary detail)
- **Overlay copy** (the on-image line for that ad's concept + accent treatment + any stamp)
- **CTA button** (Meta preset: Learn More / Sign Up / Apply / Register)
- **Destination** (the URL the click goes to)

State plainly what's **constant** across all variations (offer, destination, CTA, proof block, voice) and what's being **tested** (hook, identity, concept/overlay) so the buyer runs a clean test.

### Step 5 — Scrub, then output
Run every shipping line (concept on-image text, angles, all six ad pieces) back through the human-copy standard. Hunt the high-frequency tells: em dashes, rhythmic triplets, "it's not X it's Y," question-then-list, fake-candor openers, forbidden words, round-number tells. Fix in place. The design-prompt paragraphs are art direction, not ad copy, so they don't need the no-em-dash treatment, but keep them clear.

---

## OUTPUT FORMAT — use this exact structure

```
# [Client] — Meta Ad Kit (Round [N])

**Buyer in one line:** [the insider read on who this calls out]
**Flags / assumptions:** [funnel + destination, proof rules, any excluded names, compliance flags, missing inputs]

## 1. Ad Library research
[3-5 tight references: hook / angle / CTA / longevity / borrow-or-counter]

## 2. Concepts
[5-8 concepts, each: name → Text (on-image) + accent → Visual → Design prompt]

## 3. Validate Messaging angles
[4-6 labeled identity callouts]

## 4. Ad variations
[constants vs. tested, then 2-4 full ads in the six-piece anatomy]

## HANDOFF
[which 2-3 to run first and why; note that concepts are design-ready as written and angles can be rendered by roas-ad-design; biggest available proof lift]
```

Save to `/mnt/user-data/outputs/` and present it. Offer a DOCX only if asked.

---

## HARD RULES

- **Real proof only.** No invented testimonials, names, or results. Honor every exclusion the user gave (e.g., a name they said to keep out).
- **Concept output is three fields.** Visual, on-image text, design prompt. Don't pad it back out with mechanism/pole/segment in the printed output.
- **Validate Messaging ships every time**, even if unasked. 4-6 distinct identities, not five flavors of one.
- **Research before writing.** 3-5 references, grounded, tight.
- **Every shipping line passes the human-copy standard.** Meta punishes AI smell with worse relevance and CPM.
- **Client's voice**, first person, for the ad copy. Not the agency's voice, not a generic brand voice.
- **Flag, don't fudge.** Borderline income/health/protected-attribute claims get flagged for the client to confirm, not silently shipped.

---

## COMMON PITFALLS

- **One mechanism, many coats of paint.** The concept set's whole value is range. Spread across mechanisms.
- **Vague design prompts.** "Make it premium" is not design-ready. The prompt must name the scene, style, palette, the exact on-image text and its placement, the accent treatment, and the format — enough that a designer or image tool needs no follow-up. See `references/design-prompt-spec.md`.
- **Decorative concept visuals.** A smiling person on a gradient is wallpaper. The visual literalizes an idea or proves a pain.
- **Burying the hook.** First line of primary text carries the click and truncates ~125 chars.
- **A copy blob.** Deliver the six labeled pieces per ad, not a paragraph the buyer must disassemble.
- **Skipping research or angles.** Both are required, every time.
$skill_roas_ad_kit_body$,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skills
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-kit'
);

INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-kit', 'references/design-prompt-spec.md', $res_roas_ad_kit_references_design_prompt_spec_md$# Design-Ready Prompt Spec

The design prompt is the new artifact this skill adds. Its job: a designer (or an image tool like the `roas-ad-design` renderer) can produce the creative from the prompt alone, with zero follow-up questions. If a designer would have to come back and ask "what color? what size? where does the text go?", the prompt isn't done.

Write it as **one complete paragraph** (plus a short format tag) that a person can read or paste straight into an image tool. Pack in all of the following:

1. **Format / size** — default to feed **4:5** and story **9:16**; add **1:1** if useful. State it up front as a tag.
2. **Scene** — what is literally in frame: the subject, the setting, the framing (close-up / wide / top-down / split), and the focal point. This is where the concept's idea gets literalized (the empty chair, the two cold coffees, the split screen). Be concrete.
3. **Style & lighting** — the medium and mood: photographic, cinematic, editorial, product-shot, flat-graphic; the lighting (moody/low-key, bright/clean, golden, neon). Match the client's brand look.
4. **Palette + brand color** — the base tones and exactly where the client's brand color appears (the accent highlight, a prop, a tint). Name the hex if known.
5. **On-image text** — the exact words, where they sit (top third / centered / lower third), the hierarchy if there's more than one line, and the **accent-word treatment** (marker highlight in brand color / bold / color block). The accent word is the one the eye should snap to.
6. **Brand & logo rule** — client wordmark placement, or "no client logo." Note any stamp (event/date) only if the offer has one; book-a-call and application funnels usually have no stamp.
7. **Avoid** — the failure modes: no stock-smile-on-gradient, no clutter, text must stay legible at thumbnail size, no fake/again-generated logos of real brands, no real people's likenesses unless cleared.

## Two creative types — handle the text differently

- **Illustrative / photographic concepts** (a metaphor object, a staged scene, a split): the design prompt is a full scene brief as above. These are the concepts this skill mostly produces.
- **Text-on-texture validate-messaging creatives** (a callout line on paper/concrete, accent highlighted): these are exactly what `roas-ad-design` renders. For these, keep the prompt short and defer to that skill's conventions (centered line on texture, identity phrase marker-highlighted, brand color, optional stamp, no client logo). Note "→ render via roas-ad-design."

## Template

```
**Design prompt** ([4:5 + 9:16]): [Scene — concrete subject, setting, framing, focal point].
[Style & lighting]. [Palette, and where the brand color/hex lands]. On-image text: "[exact
words]" set [placement], with [ACCENT WORD] [highlight/bold/color treatment]. [Logo/stamp rule].
Avoid: [the relevant failure modes]. Keep text legible at thumbnail size.
```

## Worked examples

**Concept: Stop Buying Lunch** (insider-ritual)
> **Design prompt** (4:5 + 9:16): Top-down shot of a small restaurant table for two, two coffees gone cold, one chair pushed out and empty, a folded lunch receipt on the table. Moody, cinematic, shallow depth of field, warm low light. Dark premium palette with the brand color as a thin underline beneath the headline. On-image text: "STOP BUYING LUNCH TO GET THE MEETING" set across the lower third, with LUNCH marker-highlighted in the brand color. No client logo. Avoid stock-smiling people, clutter, and busy backgrounds. Keep text legible at thumbnail size.

**Concept: They'll Say Yes** (status reframe)
> **Design prompt** (4:5 + 9:16): An empty podcast guest chair across a recording desk, mic on a boom angled toward it, a small name card waiting on the desk, studio lighting and a softly blurred video wall behind. Cinematic, low-key, premium. Dark palette, brand color on the name card edge. On-image text: "THEY IGNORED YOUR EMAIL. THEY'LL SAY YES TO THIS." set top third, two lines, with YES in a brand-color block. No client logo. Avoid clutter and any visible faces. Keep text legible at thumbnail size.

The difference between a usable prompt and a useless one is specificity. "A nice studio shot, premium feel, with the headline" forces the designer to invent everything. The examples above leave nothing to guess.
$res_roas_ad_kit_references_design_prompt_spec_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-kit' AND file_path = 'references/design-prompt-spec.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-kit', 'references/output-example.md', $res_roas_ad_kit_references_output_example_md$# Output Example (condensed)

A trimmed real deliverable so the output shape is unambiguous. Match this structure. (Client: a Las Vegas podcast studio selling a done-for-you membership; ads drive to a VSL → application → booked call.)

---

# Origin Studios — Meta Ad Kit (Round 1)

**Buyer in one line:** a Las Vegas business owner who's been chasing the right people with coffees and cold follow-ups, who knows they "should" make content but has a years-old note that says "start a podcast" and nothing to show for it.

**Flags / assumptions:** Funnel = ad → VSL → application → call; CTA Learn More → VSL opt-in (originpodcaststudios.com). Proof is real only (guest roster + 5.0 Google); no testimonials exist yet; a specific guest name is excluded per client instruction. Clip-posting is a higher tier, so content lines stay honest to the hero tier.

## 1. Ad Library research
1. **ContentDFY (Ben Adkins)** — DFY podcast for brick-and-mortar. Hook: "posts get buried, ads ignored, emails unopened." Speed promise "3 episodes in 14 days." Borrow the objection-kill + speed; counter that they have no real studio.
2. **Podcasts Done For You** — authority/"easy content," explicitly "downloads aren't the measure." Borrow the downloads-don't-matter angle.
3. **Shop Marketing Pros** — documented "listeners/guests become clients." Borrow the sales-channel proof angle.
4. **Phil Graham "cheap leads" view** — lead quality beats cost; keep the ad slightly self-selecting.
5. **Generic DFY look** — studio-less, smiling headshots. Counter-position on the real room + roster.

## 2. Concepts

### Stop Buying Lunch
- **Text (on-image):** "STOP BUYING LUNCH TO GET THE MEETING" — accent: LUNCH
- **Visual:** two coffees gone cold on an empty restaurant table for two, a folded lunch receipt.
- **Design prompt** (4:5 + 9:16): Top-down shot of a small table for two, two cold coffees, one empty pushed-out chair, a folded receipt. Moody cinematic, warm low light, shallow depth of field. Dark premium palette, brand color as a thin underline under the headline. On-image text "STOP BUYING LUNCH TO GET THE MEETING" across the lower third, LUNCH marker-highlighted in brand color. No client logo. Avoid stock-smiles and clutter. Legible at thumbnail.

### They'll Say Yes
- **Text (on-image):** "THEY IGNORED YOUR EMAIL. THEY'LL SAY YES TO THIS." — accent: YES
- **Visual:** an empty podcast guest chair across the desk, mic angled toward it, name card waiting.
- **Design prompt** (4:5 + 9:16): Empty guest chair across a recording desk, boom mic angled in, name card on the desk, blurred video wall behind. Cinematic low-key premium. Dark palette, brand color on the name-card edge. On-image text "THEY IGNORED YOUR EMAIL. THEY'LL SAY YES TO THIS." top third, two lines, YES in a brand-color block. No client logo. Avoid clutter and visible faces. Legible at thumbnail.

### One Hour, A Month of Content
- **Text (on-image):** "ONE HOUR IN THIS ROOM = A MONTH OF CONTENT" — accent: A MONTH OF CONTENT
- **Visual:** one recording session in the center, clips and posts fanning out into a grid.
- **Design prompt** (4:5 + 9:16): A single studio recording session center-frame, with phone-sized clip thumbnails and social posts fanning outward into a clean grid (the one-to-many idea). Bright, modern, premium. Dark base with brand color on the fan of clips. On-image text "ONE HOUR IN THIS ROOM = A MONTH OF CONTENT" top third, with A MONTH OF CONTENT highlighted in brand color. No client logo. Avoid clutter; keep the grid clean. Legible at thumbnail.

*(…3-5 more across other mechanisms — quiet evidence, mismatch, belief reversal, counter-position studio…)*

## 3. Validate Messaging angles
1. **Relationship seller —** "If you're a Las Vegas business owner who's bought a hundred coffees and lunches trying to get in front of the right people, we'll give you a better way to get them in the room: your own show."
2. **Coach/consultant —** "If you're a coach who knows you should be making content but the editing never happens, we'll hand you a finished show every week while you do nothing but talk."
3. **Founder chasing access —** "If there's someone in your industry you've been trying to reach for months, we'll show you why they'll give you a full hour the moment you invite them on your show."
4. **Burned-out quitter —** "If you've started a podcast and quit because the editing buried you, we'll run the whole thing so all you do is show up and record."
5. **Successful but invisible —** "If your business is doing well but nobody outside your customers knows your name, we'll turn one hour a week into the content that makes you the known name in your space."

## 4. Ad variations
**Constant:** offer (apply to record at Origin), destination (VSL opt-in), CTA (Learn More), proof block (roster + 5.0 Google), voice (Origin, first person). **Tested:** hook, identity, concept/overlay.

### AD 1 — "Stop Buying Lunch" (identity: relationship seller)
- **Primary text:** You've spent a small fortune on coffees and lunches trying to get the right people in this town to give you an hour. There's an easier way, and the people you've been chasing will thank you for it. Invite them onto your podcast. The client you've been circling, or the partner who could send you deals, will ignore a sales email and happily say yes to being a guest. Then you've got them across the table for a full hour, and you both walk away with content. You don't need to know a thing about cameras or editing. You show up and talk. It's the same room where [roster names] have recorded, and we're five stars on Google. Tap Learn More to apply.
- **Headline:** Get the Right People in the Room
- **Description:** Apply to record in Las Vegas
- **Overlay copy:** "STOP BUYING LUNCH TO GET THE MEETING" (accent: LUNCH)
- **CTA:** Learn More
- **Destination:** originpodcaststudios.com

*(…AD 2 and AD 3 in the same six-piece shape, each leading with a different identity/concept…)*

## HANDOFF
Run concepts 1, 2, and 3 first — they cover the sales channel, the access, and the content, and they're distinct. All three are design-ready as written; the angles can also be rendered as text-on-texture via roas-ad-design. Biggest lift: one real "a guest became a client" story would turn the access ad into proof.
$res_roas_ad_kit_references_output_example_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-kit' AND file_path = 'references/output-example.md'
);

-- roas-ad-design
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design',
  $skill_roas_ad_design_name$roas-ad-design$skill_roas_ad_design_name$,
  $skill_roas_ad_design_desc$Renders ROAS Meta ad creatives, the text-on-texture images that pair with the ad copy. From one locked line it outputs THREE creatives by default, light, dark, and bold. Light and dark carry the client's brand color (marker highlight plus an optional subtle background tint); bold stays neutral and stock. A centered Validate Messaging line on a paper or concrete texture, the identity phrase marker-highlighted or bolded, plus an optional FREE TRAINING / date / LIVE ON stamp ending in the official Zoom logo. Copy renders verbatim and no client logo ever appears. Supports brand colors and feed, square, and story sizes, and batch-renders sets. Load for the visual side of an ad. Triggers on "design the ad," "make the ad creative," "ad image," "render the ad," "creative for the validate messaging lines," "webinar ad creative," or turning ad copy into a finished graphic. Do NOT load to write the copy (that's roas-ad-copy), or for landing pages, logos, or non-ad graphics.$skill_roas_ad_design_desc$,
  $skill_roas_ad_design_body$---
name: roas-ad-design
description: Renders ROAS Meta ad creatives, the text-on-texture images that pair with the ad copy. From one locked line it outputs THREE creatives by default, light, dark, and bold. Light and dark carry the client's brand color (marker highlight plus an optional subtle background tint); bold stays neutral and stock. A centered Validate Messaging line on a paper or concrete texture, the identity phrase marker-highlighted or bolded, plus an optional FREE TRAINING / date / LIVE ON stamp ending in the official Zoom logo. Copy renders verbatim and no client logo ever appears. Supports brand colors and feed, square, and story sizes, and batch-renders sets. Load for the visual side of an ad. Triggers on "design the ad," "make the ad creative," "ad image," "render the ad," "creative for the validate messaging lines," "webinar ad creative," or turning ad copy into a finished graphic. Do NOT load to write the copy (that's roas-ad-copy), or for landing pages, logos, or non-ad graphics.
---

# ROAS Ad Design — render the creative that pairs with the copy

The visual half of the ad system. `roas-ad-copy` writes the Validate Messaging lines; this skill turns each line into finished Meta creatives in the house style: one centered line on a paper/concrete texture, the identity phrase emphasized, the Zoom stamp on training ads.

The renderer is `assets/render_ad.py` (Pillow + numpy + Poppins + the bundled `assets/zoom_logo.png`, self-contained, no browser/network). It reproduces the reference creatives faithfully. Drive the engine; don't build images by hand or with the visualizer. Read `references/design-system.md` before the first render.

---

## THE RULES (locked)

1. **Three outputs per line.** Every line renders LIGHT, DARK, and BOLD. A set is light + dark + bold for each line.
2. **Brand = colors, on light + dark only.** Light and dark use the client's brand color for the marker (and an optional subtle background tint). BOLD is always neutral/stock, no client color. Brand identity is colors only; texture, layout, Poppins, and the stamp stay stock.
3. **No client logo, ever.** The only logo on a creative is the Zoom logo in the stamp. No client/product logos or wordmarks.
4. **Copy is verbatim.** Render the exact locked line from `roas-ad-copy`. Never rewrite, shorten, reflow, or "improve" it. Never add an em dash. Never cut words.
5. **Keep it simple.** One line of copy, one highlighted phrase, the simple stamp, nothing else. See the design-tool guardrails in `references/design-system.md` when working in a design tool instead of the engine.

---

## INPUTS — gather before rendering

1. **The copy line(s)** — the locked Validate Messaging set from `roas-ad-copy`. Render one set (light/dark/bold) per line. If you don't have the lines, get them or write them first with `roas-ad-copy`. Render them verbatim.
2. **The highlighted phrase** per line — the identity callout ("project manager"). Infer if obvious; otherwise ask.
3. **Client brand color(s)** — at minimum a brand marker hex for light + dark. Optionally a light-background hex and a dark-background hex for a subtle tint. If none given, light/dark use stock yellow/red and you can flag that a brand color would be better.
4. **Event stamp** — for live trainings, the offer + date + "LIVE ON" (the engine appends the Zoom logo). Omit for evergreen.
5. **Size(s)** — portrait 1080×1350 (default), square, story. Render multiple if running feed + stories.

Never ask for or use a client logo file. Brand identity is colors, not logos.

---

## STEP 1 — DECIDE THE SET

One line in → three creatives out (light branded, dark branded, bold neutral). Confirm the highlighted phrase per line and the brand color. State the plan (how many lines × light/dark/bold, which sizes) before rendering so it can be adjusted.

## STEP 2 — RENDER

Write a JSON **line spec** per line (a list for several lines) following the schema in `references/design-system.md`, then run the engine:

```bash
python assets/render_ad.py config.json
```

Each line spec sets `text` (verbatim), `highlight`, optional `stamp` (`"LIVE ON"` gets the Zoom logo), `size`, `brand_color`, optional `brand_bg_light` / `brand_bg_dark`, and `out_prefix`. The engine produces `{prefix}_light.png`, `{prefix}_dark.png`, `{prefix}_bold.png` — light/dark branded, bold neutral. Write outputs to `/mnt/user-data/outputs/`.

`python assets/render_ad.py --demo` regenerates the three reference creatives (with the real Zoom logo).

## STEP 3 — REVIEW + PRESENT

`view` the PNGs: the highlight sits on the right phrase, the brand color is on light/dark (and bold is neutral), the Zoom logo reads correctly, nothing overflows the margins, copy matches the locked line exactly. Re-render if a line overflows a size. Then `present_files` all three per line. Offer to pair them with the full ad copy (primary text, headline, CTA) from `roas-ad-copy` if that wasn't already delivered.

---

## COMMON PITFALLS

- **Not producing all three cuts.** Every line is light + dark + bold by default.
- **Branding the bold cut.** Bold is neutral/stock, no client color, no tint. Only light and dark are branded.
- **Adding a client logo.** Never. Only the Zoom logo in the stamp.
- **Rewriting the copy.** Verbatim only. No em dashes, no cut words, no "improvements."
- **Design clutter.** No background photos, no app/feed chrome, no badges or pills ("LIVE MASTERCLASS," "100% FREE"), no decorative elements, no logo lockups. One line, one highlight, the stamp.
- **Building by hand or with the visualizer.** Use `render_ad.py`.
- **Highlighting the wrong thing.** The marker goes on the identity phrase, not a random keyword.
- **Stamp creep.** Offer + date + "LIVE ON" + Zoom logo. Not a sentence.

---

## Where this sits

`roas-ad-copy` (lines + Validate Messaging) → `roas-ad-design` (light/dark/bold creatives) → buyer assembles in Ads Manager → click hits the registration page → `roas-webinar-emails` / `roas-master-webinar`. Keep the identity and angle consistent across all of it.
$skill_roas_ad_design_body$,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skills
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design'
);

INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'references/design-system.md', $res_roas_ad_design_references_design_system_md$# ROAS Ad Creative — Design System

The look: a single Validate Messaging line, centered, large, on a paper/concrete texture, with the identity phrase emphasized and an optional event stamp at the bottom. No photos, no logos (except the Zoom logo in the stamp), no clutter. The words are the creative. Pairs with `roas-ad-copy` (that skill writes the lines; this one renders them).

The renderer is `assets/render_ad.py` (Pillow + numpy + Poppins + the bundled `assets/zoom_logo.png`, fully self-contained). Don't hand-build images; drive the engine.

---

## THREE OUTPUTS PER LINE (default)

Every line renders THREE creatives. A "set" is light + dark + bold for each line:

- **LIGHT** — branded. Paper texture, marker highlight in the client's brand color, optional subtle light brand tint on the background.
- **DARK** — branded. Charcoal texture, marker highlight in the client's brand color, optional subtle dark brand tint.
- **BOLD** — neutral house style. Charcoal texture, the identity phrase just bolded (no marker, NO client color, no brand tint). The clean, universal reference cut.

Light + dark = branded. Bold = stock/neutral. Always produce all three unless told otherwise.

## Brand identity = COLORS ONLY (light + dark)

The client's brand shows up only as color, and only on light + dark:
- `brand_color` (hex) — the marker highlight color, replacing stock yellow/red. The engine auto-picks white or dark ink inside the marker for contrast.
- `brand_bg_light` / `brand_bg_dark` (hex, optional) — a subtle brand tint for the background. Keep it subtle; the copy stays the hero.

Everything else stays stock: texture, layout, Poppins typography, the stamp. No brand fonts, no brand textures, no brand layouts. If no `brand_color` is given, light/dark fall back to stock yellow/red.

The BOLD cut never takes any client color or tint. It is the neutral version every time.

## NO CLIENT LOGO, EVER

The only logo that ever appears on a creative is the Zoom logo in the stamp. No client or product logo lockups, no brand wordmarks (no "AOS," no "AUTHORITY," nothing). We don't carry client logo files and they never appear. Brand identity here is colors, not logos.

## COPY IS VERBATIM

The engine renders the exact text it's given (the locked lines from `roas-ad-copy`). It never rewrites, shortens, reflows words, or "improves" copy, and never adds an em dash. It only wraps lines to fit the frame. Pass the copy through untouched.

---

## The Zoom logo stamp

For live-training ads, the stamp is two lines near the bottom, bold:
- Line 1: offer + date, e.g. "FREE TRAINING. JUNE 17TH."
- Line 2: "LIVE ON" followed by the **official Zoom logo image** (`assets/zoom_logo.png`), composited by the engine. The drawn dot/wordmark is gone; it's the real logo file now, permanent default.

Pass the second stamp line as `"LIVE ON"` (the engine appends the logo). Omit the whole stamp for evergreen offers. By default the BOLD cut is rendered without the stamp (clean/universal); set `bold_stamp: true` to add it.

## Highlight styles

- **marker** — rounded color block behind the identity phrase (highlighter effect), phrase bold. Brand color on light/dark, stock yellow/red if no brand color. The Yasir / Speak Like a CEO look. Used for LIGHT and DARK.
- **bold** — the phrase just bolded, no color block. The Taylor / Leadr look. Used for the BOLD cut.
- **none** — uniform weight, rare.

One highlighted phrase per creative: the identity ("project manager," "spiritual work deserves a bigger audience"), not a random keyword.

## Typography

Poppins throughout (installed). Body Medium, highlighted phrase Bold, stamp Bold. Centered, line spacing ~1.34. The engine auto-fits the size so the line fills the frame without overflowing. Don't set font sizes by hand.

## Dimensions

- **portrait** 1080×1350 (4:5) — default, best feed real estate
- **square** 1080×1080 (1:1) — universal
- **story** 1080×1920 (9:16) — Stories / Reels

## Texture

Procedural (speckle + blur + vignette), license-clean, no asset files. Light reads as paper, dark as concrete. Subtle on purpose so the copy stays the hero.

---

## Engine schemas

**Line spec (recommended — expands to light/dark/bold):**
```json
{
  "text": "If you're a project manager who ...",
  "highlight": "project manager",
  "stamp": ["FREE TRAINING. JUNE 17TH.", "LIVE ON"],
  "size": "portrait",
  "brand_color": "#7C3AED",
  "brand_bg_light": "#F4F1FB",
  "brand_bg_dark": "#1E1633",
  "bold_stamp": false,
  "out_prefix": "out/yasir_pm"
}
```
Produces `out/yasir_pm_light.png`, `_dark.png`, `_bold.png`. Pass a JSON **list** of line specs to render several lines at once. Drop `brand_color`/`brand_bg_*` for an unbranded set. Drop `stamp` for evergreen.

**Explicit single creative (fine control / the demo):**
```json
{ "text": "...", "highlight": "...", "variant": "light|dark",
  "highlight_style": "marker|bold|none", "highlight_color": "auto|#hex",
  "bg_override": "#hex", "stamp": ["...", "LIVE ON"], "size": "portrait", "out": "file.png" }
```

Run: `python render_ad.py config.json` — or `python render_ad.py --demo` to regenerate the three reference creatives (now with the real Zoom logo).

---

## Design-tool guardrails (when this is used as a brief, not the engine)

If this skill is used as a brief inside a design tool (e.g. Claude Design) instead of the Python engine, the output MUST still be one of the three reference looks and nothing more. Keep it simple. Hard DON'Ts:

- NO background photos or imagery. Plain or subtly brand-tinted texture only.
- NO Instagram / app / feed chrome (no profile rows, like/share/comment bars, "Sponsored" tags, phone frames).
- NO extra badges or pills. Nothing like a "LIVE MASTERCLASS" tag or a "100% FREE" badge.
- NO logo lockups of any kind except the Zoom logo in the stamp.
- NO decorative elements stacked at the bottom, no icons, no flourishes, no borders.
- NO rewriting the copy. Verbatim, no em dashes, no cut words.

The creative is ONE line of copy on a plain or subtly brand-tinted texture, ONE marker-highlighted (or bolded) phrase, and the simple stamp. Nothing else. If in doubt, match the light / dark / bold demo references in `assets/samples/` exactly.
$res_roas_ad_design_references_design_system_md$, 'text/markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'references/design-system.md'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'assets/render_ad.py', $res_roas_ad_design_assets_render_ad_py$#!/usr/bin/env python3
"""
ROAS ad-creative renderer.

Renders text-on-texture Meta ad creatives in the ROAS house style: a centered
Validate Messaging line on a paper/concrete texture, the identity phrase
marker-highlighted or bolded, and an optional event stamp ("FREE TRAINING. <date>."
+ "LIVE ON" followed by the official Zoom logo image).

Self-contained: Pillow + numpy + the Poppins font + the bundled zoom_logo.png.
No browser, no network.

COPY IS VERBATIM. This engine renders the exact text it is given. It never
rewrites, shortens, reflows words, or adds punctuation (no em dashes, ever).
It only wraps lines to fit the frame.

THREE OUTPUTS PER LINE (default). A "line spec" renders three creatives:
    LIGHT  - branded (client marker color + optional light bg tint), marker highlight
    DARK   - branded (client marker color + optional dark bg tint),  marker highlight
    BOLD   - NEUTRAL house style (no client color), bold emphasis, the clean universal cut
Only LIGHT and DARK carry client brand color. BOLD is always stock/neutral.
The only logo ever placed on a creative is the Zoom logo in the stamp. No client logos.

Usage:
    python render_ad.py config.json     # see schemas below
    python render_ad.py --demo          # regenerate the three reference creatives

Line-spec schema (recommended - expands to light/dark/bold):
    {
      "text": "If you're a project manager who ...",   # rendered verbatim
      "highlight": "project manager",                   # phrase to emphasize (str or [str])
      "stamp": ["FREE TRAINING. JUNE 17TH.", "LIVE ON"],# optional; "LIVE ON" gets the Zoom logo
      "size": "portrait",                               # square | portrait | story
      "brand_color": "#7C3AED",                         # client marker color for light+dark (optional)
      "brand_bg_light": "#F4F1FB",                      # optional subtle light bg tint
      "brand_bg_dark": "#1E1633",                       # optional subtle dark bg tint
      "bold_stamp": false,                              # default false: bold cut stays date-free/clean
      "out_prefix": "out/yasir_pm"                      # -> out/yasir_pm_light.png, _dark.png, _bold.png
    }

Explicit single-creative schema (used by --demo / fine control):
    { "text":..., "highlight":..., "variant":"light|dark", "highlight_style":"marker|bold|none",
      "highlight_color":"auto|#hex", "bg_override":"#hex", "stamp":[...], "size":..., "out":"file.png" }
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = "/usr/share/fonts/truetype/google-fonts"
FONTS = {
    "light":   f"{FONT_DIR}/Poppins-Light.ttf",
    "regular": f"{FONT_DIR}/Poppins-Regular.ttf",
    "medium":  f"{FONT_DIR}/Poppins-Medium.ttf",
    "bold":    f"{FONT_DIR}/Poppins-Bold.ttf",
}
ZOOM_LOGO = os.path.join(HERE, "zoom_logo.png")
SIZES = {"square": (1080, 1080), "portrait": (1080, 1350), "story": (1080, 1920)}

# Stock (neutral) palette. Client brand color overrides the marker on light/dark only.
PALETTE = {
    "light": dict(base=(242, 240, 235), ink=(26, 26, 26),   hi=(255, 224, 77),  hi_ink=(26, 26, 26)),
    "dark":  dict(base=(43, 43, 43),    ink=(245, 245, 245), hi=(226, 59, 46),  hi_ink=(255, 255, 255)),
}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def f(weight, size):
    return ImageFont.truetype(FONTS[weight], size)


def luminance(rgb):
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2])


def texture(size, base, dark):
    """Procedural paper/concrete texture: speckle noise + soft blur + vignette."""
    w, h = size
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, (h, w)).astype(np.float32)
    img = Image.fromarray(((noise - noise.min()) / (np.ptp(noise) + 1e-6) * 255).astype("uint8"))
    img = img.filter(ImageFilter.GaussianBlur(1.1))
    n = np.asarray(img, dtype=np.float32) / 255.0
    amp = 10.0 if not dark else 14.0
    out = np.empty((h, w, 3), dtype=np.float32)
    for i, c in enumerate(base):
        out[..., i] = c + (n - 0.5) * 2 * amp
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    d = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    vig = np.clip(1 - (d - 0.6) * (0.18 if dark else 0.10), 0, 1)
    out *= vig[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"), "RGB")


def mark_words(text, highlights):
    if isinstance(highlights, str):
        highlights = [highlights] if highlights else []
    words = text.split()
    flags = [False] * len(words)
    low = [w.lower().strip(".,!?'\"") for w in words]
    for phrase in highlights:
        pw = [p.lower().strip(".,!?'\"") for p in phrase.split()]
        if not pw:
            continue
        for i in range(len(words) - len(pw) + 1):
            if low[i:i + len(pw)] == pw:
                for j in range(len(pw)):
                    flags[i + j] = True
    return list(zip(words, flags))


def wrap(tokens, body_font, hi_font, max_w, draw):
    space = draw.textlength(" ", font=body_font)
    lines, cur, cur_w = [], [], 0.0
    for word, flag in tokens:
        fnt = hi_font if flag else body_font
        ww = draw.textlength(word, font=fnt)
        add = ww + (space if cur else 0)
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur, cur_w = [(word, flag, ww)], ww
        else:
            cur.append((word, flag, ww))
            cur_w += add
    if cur:
        lines.append(cur)
    return lines, space


def line_width(line, space):
    return sum(w for _, _, w in line) + space * (len(line) - 1)


def draw_stamp(img, draw, stamp, fs, ink, W, H):
    """Render stamp lines; a 'LIVE ON' line gets the official Zoom logo image appended."""
    sy = int(H * 0.80)
    main = f("bold", int(fs * 0.62))
    line_step = int(fs * 0.8)
    for k, line in enumerate(stamp):
        yy = sy + k * line_step
        if "LIVE ON" in line.upper():
            sf = f("bold", int(fs * 0.55))
            pre = "LIVE ON"
            bb = sf.getbbox(pre)
            text_h = bb[3] - bb[1]
            pre_w = draw.textlength(pre, font=sf)
            logo = Image.open(ZOOM_LOGO).convert("RGBA")
            logo_h = int(text_h * 1.28)
            logo_w = int(logo.width * logo_h / logo.height)
            logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
            gap = int(fs * 0.16)
            total_w = pre_w + gap + logo_w
            sx = int((W - total_w) // 2)
            draw.text((sx, yy), pre, font=sf, fill=ink)
            # vertically center logo against the text
            text_top = yy + bb[1]
            logo_y = int(text_top + (text_h - logo_h) / 2)
            img.paste(logo, (int(sx + pre_w + gap), logo_y), logo)
        else:
            lw = draw.textlength(line, font=main)
            draw.text(((W - lw) // 2, yy), line, font=main, fill=ink)


def render_one(cfg):
    """Render a single creative. Returns output path."""
    size = SIZES[cfg.get("size", "portrait")]
    W, H = size
    variant = cfg.get("variant", "light")
    pal = dict(PALETTE[variant])

    # background: optional brand tint override (light/dark only; bold passes none)
    base = pal["base"]
    if cfg.get("bg_override"):
        base = hex2rgb(cfg["bg_override"])
        # keep ink readable against the chosen base
        pal["ink"] = (245, 245, 245) if luminance(base) < 140 else (26, 26, 26)

    style = cfg.get("highlight_style", "marker")

    # marker color: client brand color if given, else stock yellow/red
    hi_color = cfg.get("highlight_color", "auto")
    if cfg.get("brand_color") and style == "marker":
        hi_color = hex2rgb(cfg["brand_color"])
        pal["hi_ink"] = (255, 255, 255) if luminance(hi_color) < 150 else (26, 26, 26)
    elif hi_color == "auto":
        hi_color = pal["hi"]
    elif isinstance(hi_color, str) and hi_color.startswith("#"):
        hi_color = hex2rgb(hi_color)

    img = texture(size, base, variant == "dark").convert("RGB")
    draw = ImageDraw.Draw(img)

    margin = int(W * 0.11)
    max_w = W - 2 * margin
    tokens = mark_words(cfg["text"], cfg.get("highlight", []))
    stamp = cfg.get("stamp") or []

    max_block_h = int(H * (0.52 if stamp else 0.62))
    fs = int(W * 0.062)
    while fs > 22:
        body_font = f("medium", fs)
        hi_font = f("bold", fs)
        lines, space = wrap(tokens, body_font, hi_font, max_w, draw)
        line_h = int(fs * 1.34)
        block_h = line_h * len(lines)
        widest = max(line_width(ln, space) for ln in lines)
        if widest <= max_w and block_h <= max_block_h:
            break
        fs -= 2

    y0 = (H - block_h) // 2
    if stamp:
        y0 = int(H * 0.30) if len(lines) <= 4 else int(H * 0.24)

    ascent, descent = body_font.getmetrics()
    pad_x, pad_y = int(fs * 0.16), int(fs * 0.10)
    radius = int(fs * 0.18)

    for li, line in enumerate(lines):
        lw = line_width(line, space)
        x = (W - lw) // 2
        y = y0 + li * line_h
        if style == "marker":
            positions, cx = [], x
            for word, flag, ww in line:
                positions.append((cx, ww, flag))
                cx += ww + space
            i = 0
            while i < len(positions):
                if positions[i][2]:
                    j = i
                    while j + 1 < len(positions) and positions[j + 1][2]:
                        j += 1
                    x0 = positions[i][0] - pad_x
                    x1 = positions[j][0] + positions[j][1] + pad_x
                    draw.rounded_rectangle(
                        [x0, y - pad_y, x1, y + ascent + descent * 0.4 + pad_y],
                        radius=radius, fill=hi_color)
                    i = j + 1
                else:
                    i += 1
        cx = x
        for word, flag, ww in line:
            if flag:
                fnt = hi_font
                col = pal["hi_ink"] if style == "marker" else pal["ink"]
            else:
                fnt = body_font
                col = pal["ink"]
            draw.text((cx, y), word, font=fnt, fill=col)
            cx += ww + space

    if stamp:
        draw_stamp(img, draw, stamp, fs, pal["ink"], W, H)

    out = cfg["out"]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "PNG")
    return out


def render_set(spec):
    """Expand one line spec into THREE creatives: light(branded), dark(branded), bold(neutral)."""
    text = spec["text"]
    highlight = spec.get("highlight", [])
    stamp = spec.get("stamp")
    size = spec.get("size", "portrait")
    brand = spec.get("brand_color")
    prefix = spec.get("out_prefix") or os.path.splitext(spec.get("out", "creative"))[0]
    bold_stamp = spec.get("bold_stamp", False)
    outs = []
    outs.append(render_one(dict(text=text, highlight=highlight, variant="light",
                                highlight_style="marker", brand_color=brand,
                                bg_override=spec.get("brand_bg_light"),
                                stamp=stamp, size=size, out=f"{prefix}_light.png")))
    outs.append(render_one(dict(text=text, highlight=highlight, variant="dark",
                                highlight_style="marker", brand_color=brand,
                                bg_override=spec.get("brand_bg_dark"),
                                stamp=stamp, size=size, out=f"{prefix}_dark.png")))
    # BOLD: neutral house style, no client color, no brand bg; clean universal cut
    outs.append(render_one(dict(text=text, highlight=highlight, variant="dark",
                                highlight_style="bold",
                                stamp=(stamp if bold_stamp else None),
                                size=size, out=f"{prefix}_bold.png")))
    return outs


# Demo regenerates the three reference creatives (with the real Zoom logo in the stamp).
DEMO = [
    dict(text="If you're a project manager who gets put on the spot in meetings and starts rambling with no idea where you're going, I'm going to show you how to organize your thoughts so fast that people think you rehearsed it.",
         highlight="project manager", variant="light", highlight_style="marker",
         stamp=["FREE TRAINING. JUNE 17TH.", "LIVE ON"], size="portrait", out="demo_light.png"),
    dict(text="If you just got promoted to a leadership position where you have to communicate constantly about critical decisions, but you're still struggling to get your point across, I'm going to show you how to walk into those conversations and make your message land every time you speak.",
         highlight="promoted to a leadership position", variant="dark", highlight_style="marker",
         stamp=["FREE TRAINING. JUNE 17TH.", "LIVE ON"], size="portrait", out="demo_dark.png"),
    dict(text="If your spiritual work deserves a bigger audience, we'll help you land a talk on one of the world's biggest stages.",
         highlight="spiritual work deserves a bigger audience", variant="dark", highlight_style="bold",
         size="portrait", out="demo_bold.png"),
]


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--demo":
        for c in DEMO:
            print("rendered", render_one(c))
        return
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    cfg = json.load(open(sys.argv[1]))
    items = cfg if isinstance(cfg, list) else [cfg]
    for c in items:
        if "variant" in c and "out" in c:          # explicit single creative
            print("rendered", render_one(c))
        else:                                        # line spec -> three creatives
            for p in render_set(c):
                print("rendered", p)


if __name__ == "__main__":
    main()
$res_roas_ad_design_assets_render_ad_py$, 'text/x-python'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'assets/render_ad.py'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'assets/samples/sample_dark_bold.png', NULL, 'image/png', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'assets/samples/sample_dark_bold.png'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'assets/samples/sample_dark_marker.png', NULL, 'image/png', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'assets/samples/sample_dark_marker.png'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'assets/samples/sample_light_marker.png', NULL, 'image/png', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'assets/samples/sample_light_marker.png'
);
INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)
SELECT NULL, NULL, 'ads_manager', 'roas-ad-design', 'assets/zoom_logo.png', NULL, 'image/png', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_skill_resources
   WHERE user_id IS NULL AND org_id IS NULL
     AND agent_key = 'ads_manager' AND skill_key = 'roas-ad-design' AND file_path = 'assets/zoom_logo.png'
);

UPDATE public.agents_registry
   SET skills = (
     SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(elem)), '[]'::jsonb)
       FROM (
         SELECT jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) AS elem
         UNION ALL SELECT 'human-written-copy'
         UNION ALL SELECT 'roas-ad-concepts'
         UNION ALL SELECT 'roas-ad-copy'
         UNION ALL SELECT 'roas-ad-kit'
         UNION ALL SELECT 'roas-ad-design'
       ) s
   ),
   updated_at = now()
 WHERE user_id IS NULL AND org_id IS NULL AND agent_key = 'ads_manager';

COMMIT;
