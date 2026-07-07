-- Update offer-builder step-prompts reference with exact JSON output schemas
-- so the agent produces the correct field keys and string[] values.

UPDATE agent_skill_resources
SET content = $stepref$# Offer Builder — Step Prompts

Each step below contains the production prompt. Use these as system instructions when generating each step's output.

**CRITICAL: Every step must output JSON using the EXACT keys shown below. Every value must be a `string[]` (array of plain strings). Never use nested objects inside arrays — only flat strings.**

---

## Step 1: Product & Market Analysis

**Temperature:** 0.7

Act as an Expert in Marketing and Advertising and analyze the provided information about a brand and its product(s). This information may include brand/product descriptions, websites, landing pages, LinkedIn profiles, YouTube transcripts, pitch decks, VSL transcripts, or other marketing materials.

Your task is to extract and rewrite this information into clear, conversational language that anyone can understand — even someone with zero prior knowledge of the industry or product.

Analyze and provide:
- Product: Describe what someone gets when they buy this. Explain it like you're talking to a neighbor who's never heard of it. Include: what the product/service is, how it's delivered, what's included, what outcomes it creates, and what it DOESN'T include. Use concrete numbers and specifics wherever possible.
- Target Market: Describe the specific group who buys this. Include: their profession/industry, business size or life stage, the main problem driving them to look for solutions, what they've likely tried before, and their readiness to invest. Be specific enough that someone could spot these people at a networking event.
- What Do We Sell: Summarize the product in one simple sentence.
- Who We Sell It To: Summarize the target market in one simple sentence.

Quality Standards:
- Write at a 12th-grade reading level or below
- No jargon, buzzwords, or industry terms without explanation
- Use specific numbers instead of vague quantities
- Focus on benefits and outcomes, not features
- Each sentence must add new, essential information

### Required JSON Output — step1_data

```json
{
  "product": ["sentence 1 about the product", "sentence 2 about delivery", "sentence 3 about outcomes"],
  "target_market": ["sentence 1 about who they are", "sentence 2 about their problem", "sentence 3 about readiness"],
  "what_we_sell": ["One clear sentence summarizing the product"],
  "who_we_sell_to": ["One clear sentence summarizing the target market"]
}
```

Use ONLY these 4 keys. Every value is an array of strings — no objects, no nested structures.

---

## Step 2: Power Offer Statement

**Temperature:** 0.7

Use the following information on my product and target market to craft a Joel Erway Power Offer that follows this framework:

**If I could show you how to [MAJOR BENEFIT], [SECONDARY BENEFIT], and [TERTIARY BENEFIT] [VEHICLE], without [COMMON OBJECTION], would you [CALL TO ACTION]?**

Components to generate:
1. Power Offer Statement — the complete statement
2. Major Benefit — primary, most compelling outcome
3. Secondary Benefit — additional valuable outcome
4. Tertiary Benefit — third valuable outcome
5. Vehicle — the method or system
6. Common Objection — typical concern addressed
7. Call to Action — immediate next step (soft, conversational)

### Required JSON Output — step2_data

```json
{
  "step2_power_offer_statement": ["The full power offer statement as one string"],
  "step2_major_benefit": ["Primary compelling outcome"],
  "step2_secondary_benefit": ["Additional valuable outcome"],
  "step2_tertiary_benefit": ["Third valuable outcome"],
  "step2_vehicle": ["The method or system that delivers the benefits"],
  "step2_common_objection": ["The typical concern this offer overcomes"],
  "step2_call_to_action": ["The immediate, soft next step"]
}
```

Use ONLY these 7 keys. Every value is an array of strings.

---

## Step 3: Buyer Persona

**Temperature:** 0.7

You are an elite consumer psychology expert. Create a detailed buyer persona covering all 19 sections below. Make everything visceral, dimensional, and emotionally resonant. Write in the buyer's voice where indicated.

Sections:
- Demographic Foundation (name, age, career, family, lifestyle, frustrations)
- Core Problem (deepest pain point in 2-3 visceral sentences in buyer's voice)
- Powerful Emotions (5 strongest emotions with vivid examples)
- Biggest Fears (5 deep, private fears — specific and brutal)
- Fear Impact on Relationships (5 relationship impacts)
- Hurtful Comments (5 stinging comments from close people)
- Past Attempts to Solve (5 failed attempts)
- Avoidance Behaviors (5 things they don't want to do)
- Perfect Outcomes (dream transformation in buyer's voice + 5 outcomes)
- Transformation Impact (5 specific life shifts)
- Success Markers (concrete milestone = "made it")
- Secondary Gains (hidden comforts from the problem)
- Blame Targets (5 external scapegoats)
- Main Objections (5 general objections — NOT product-specific)
- Background Profile (2-3 sentences in buyer's voice)
- Psychological Drivers (short/mid/long-term goals)
- Internal Voice (unspoken thoughts and phrases)
- Content Preferences (tone, themes, triggers)
- Comprehensive Summary (detailed summary combining all above; inside the one string use blank lines / double newlines between paragraphs so the app preview has readable whitespace)

### Required JSON Output — step3_data

```json
{
  "step3_demographics": ["Name, age, career description", "Family and lifestyle", "Key frustrations"],
  "step3_core_problem": ["Visceral sentence 1 in buyer's voice", "Visceral sentence 2"],
  "step3_powerful_emotions": ["Emotion 1 with example", "Emotion 2 with example", "Emotion 3", "Emotion 4", "Emotion 5"],
  "step3_biggest_fears": ["Fear 1", "Fear 2", "Fear 3", "Fear 4", "Fear 5"],
  "step3_fear_relationship_impact": ["Impact 1", "Impact 2", "Impact 3", "Impact 4", "Impact 5"],
  "step3_hurtful_comments": ["Comment 1", "Comment 2", "Comment 3", "Comment 4", "Comment 5"],
  "step3_past_attempts": ["Attempt 1", "Attempt 2", "Attempt 3", "Attempt 4", "Attempt 5"],
  "step3_avoidance_behaviors": ["Avoidance 1", "Avoidance 2", "Avoidance 3", "Avoidance 4", "Avoidance 5"],
  "step3_perfect_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3", "Outcome 4", "Outcome 5"],
  "step3_transformation_impact": ["Shift 1", "Shift 2", "Shift 3", "Shift 4", "Shift 5"],
  "step3_success_markers": ["The concrete milestone that means they made it"],
  "step3_secondary_gains": ["Hidden comfort 1", "Hidden comfort 2"],
  "step3_blame_targets": ["Scapegoat 1", "Scapegoat 2", "Scapegoat 3", "Scapegoat 4", "Scapegoat 5"],
  "step3_main_objections": ["Objection 1", "Objection 2", "Objection 3", "Objection 4", "Objection 5"],
  "step3_background_profile": ["2-3 sentences in the buyer's own voice"],
  "step3_psychological_drivers": ["Short-term goal", "Mid-term goal", "Long-term goal"],
  "step3_internal_voice": ["Unspoken thought 1", "Unspoken thought 2", "Inner phrase they repeat"],
  "step3_content_preferences": ["Preferred tone", "Themes that resonate", "Triggers that grab attention"],
  "step3_comprehensive_summary": ["Multi-paragraph narrative in ONE string; separate logical sections with blank lines (double newlines) for readable whitespace — not one wall of text"]
}
```

Use ONLY these 19 keys. Every value is an array of strings.

**step3_comprehensive_summary — whitespace:** Still exactly one string in the array; inside that string, use blank lines (double newlines) between paragraphs so the Artifacts preview is scannable.

---

## Step 4: ICP Analysis

**Temperature:** 0.7

Use Step 4a (B2B) or Step 4b (B2C) depending on the offer type.

**B2B variant** covers: company size, revenue, tech stack, pain points, decision-makers, buying triggers, messaging angles, competitive landscape.

**B2C variant** covers: expanded demographics, digital behavior, purchase patterns, pain urgency, community mapping, conversion triggers, psychographic depth.

### Required JSON Output — step4_data

```json
{
  "step4_company_demographics": ["Company type/size", "Revenue range", "Industry vertical"],
  "step4_organizational_details": ["Team structure", "Decision-making process", "Tech stack"],
  "step4_pain_points_goals": ["Pain point 1", "Pain point 2", "Goal 1", "Goal 2"],
  "step4_existing_solutions": ["What they currently use", "Why it falls short"],
  "step4_messaging_triggers": ["Trigger 1", "Trigger 2", "Trigger 3"],
  "step4_message_testing_signals": ["Signal 1", "Signal 2"],
  "step4_buying_triggers": ["Trigger 1", "Trigger 2", "Trigger 3"],
  "step4_psychographics": ["Value 1", "Belief 1", "Motivation 1"],
  "step4_behavioral_insights": ["Behavior 1", "Behavior 2"],
  "step4_cultural_nuances": ["Nuance 1", "Nuance 2"],
  "step4_competitive_landscape": ["Competitor 1 and positioning", "Competitor 2 and positioning"],
  "step4_success_stories": ["Story or proof point 1", "Story or proof point 2"],
  "step4_final_summary": ["ICP summary in ONE string; separate major ideas with blank lines (double newlines) for readable whitespace in the app"]
}
```

Use ONLY these 13 keys. Every value is an array of strings.

**step4_final_summary — whitespace:** Same pattern — one string, with paragraph breaks inside it for readable whitespace in the app.

---

## Step 5: Competitive Edge + Unique Mechanisms

**Temperature:** 0.7

Conduct competitive research and identify:

1. Company Overview — what the company offers, who it serves, core value proposition
2. What's Included — core features, benefits, components (results-driven)
3. Challenges Solved — pain points from customer perspective
4. Competitive Advantages — why this is the best choice
5. Key Differentiating Factors — what's impossible to find elsewhere
6. Direct Competitors Analysis — key competitors and why this is superior
7. Results & Success Stories — real-world proof (only if verified)
8. Credibility & Social Proof — awards, media, endorsements (only if verified)

Then identify:
- Unique Mechanisms — proprietary processes, exclusive tools, insider knowledge
- Differential Mechanisms — better/faster solutions, superior experience, stronger guarantees

### Required JSON Output — step5_data

Save competitive edge data to step5_data (step_number: 5):

```json
{
  "step5_company_overview": ["What the company offers", "Who it serves", "Core value proposition"],
  "step5_included_features": ["Feature/benefit 1", "Feature/benefit 2", "Feature/benefit 3"],
  "step5_challenges_solved": ["Challenge 1", "Challenge 2", "Challenge 3"],
  "step5_competitive_advantages": ["Advantage 1", "Advantage 2", "Advantage 3"],
  "step5_differentiating_factors": ["Factor 1", "Factor 2"],
  "step5_competitor_analysis": ["Competitor 1: why we're superior", "Competitor 2: why we're superior"],
  "step5_success_stories": ["Proof point 1", "Proof point 2"],
  "step5_credibility_proof": ["Award/endorsement 1", "Media mention 1"]
}
```

Use ONLY these 8 keys. Every value is an array of strings.

### Required JSON Output — step6_data

Save unique mechanisms to step6_data (step_number: 6):

```json
{
  "unique_mechanisms": ["Proprietary process 1", "Exclusive tool 1", "Insider knowledge 1"],
  "differential_mechanisms": ["Better/faster solution 1", "Superior experience 1", "Stronger guarantee 1"]
}
```

Use ONLY these 2 keys. Every value is an array of strings.

**Step 5 produces TWO saves:**
1. `update_offer_step` with `step_number: 5` and `step_data: { step5 fields }`
2. `update_offer_step` with `step_number: 6` and `step_data: { unique_mechanisms, differential_mechanisms }`
$stepref$,
    updated_at = NOW()
WHERE skill_key = 'offer-builder'
  AND agent_key = 'vibey'
  AND file_path = 'references/step-prompts.md';
