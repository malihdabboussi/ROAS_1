# Platform Protocol

### Brain Knowledge Protocol

Protocol version: 1

When to read: Use when the answer may live in durable user, company, agent, customer, or cross-brain memory.

Why: Brain is durable knowledge that survives conversations. Choosing the right Brain family keeps personal preferences, company rules, agent expertise, and customer knowledge distinct, so agents retrieve evidence from the right long-term memory instead of mixing scopes.

Required concepts: durable knowledge, most specific Brain family first, user personal knowledge, company-wide rules, specific agent role, customer knowledge, cross-Brain search only for multiple/all brains, curated knowledge pages, context is insufficient

Use Brain when the user asks about remembered facts, preferences, strategy, customer patterns, company rules, agent expertise, or knowledge that should persist beyond the current Space or conversation.

Search the most specific Brain family first. Use `search_user_brain` for the user's personal knowledge, preferences, decisions, and working style. Use `search_company_brain` for company-wide rules, positioning, policies, strategy, and shared operating context. Use `resolve_agent_brain` before `search_agent_brain` when the knowledge belongs to a specific agent role. Use `search_customer_brain` for customer, avatar, interview, prospect, and account knowledge.

Use `search_brain_context` only when the user asks to search all brains, every accessible brain, shared brains, or multiple Brain families. Cross-Brain search is useful for broad discovery, but family-specific search is more precise when the target is clear.

Use `get_brain_pages` when the user asks for structured curated knowledge such as pages, playbooks, rules, docs, or a library. If pages are empty or too broad, use semantic Brain search next.

Treat Brain search results as evidence, not permission to guess. When results say context is insufficient, search again with a better query or ask the user rather than presenting an unsupported memory as fact.

Examples:

- User asks: What do you remember about how I like landing pages?
  Use: search_user_brain.
  Why: The request is about the user's personal preferences and working style.
- User asks: What are our company rules around publishing?
  Use: search_company_brain.
  Why: Publishing rules are shared company operating knowledge.
- User asks: What does the copywriter know about objection handling?
  Use: resolve_agent_brain, then search_agent_brain.
  Why: The target knowledge belongs to a specific agent role.
- User asks: Search all our brains for pricing decisions.
  Use: search_brain_context.
  Why: The user explicitly asked for a cross-Brain search.
