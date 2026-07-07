# AI-Assisted Reverse Engineering and Legacy System Skillization

## Context

A new cluster of entries describes AI agents as a force multiplier for reverse engineering undocumented protocols, proprietary hardware, and legacy systems. The durable point is not that the model magically understands hidden systems; it is that the agent can plan, run, observe, and iterate over systematic experiments faster than a human would.

## Core Insight

For complex engineering discovery, the differentiator is agentic orchestration, not raw model IQ. The useful pattern is: AI designs and analyzes the experiment; humans or deterministic tools execute physical or low-level steps; the results are fed back into a reusable skill.

## The Story

The first shift is the **AI-as-brain, human-as-hands paradigm**. In hardware and systems work, the AI can formulate hypotheses, design test sweeps, analyze logs, and select the next experiment, while the human performs physical actions such as rebooting devices, observing lights, swapping cables, or confirming real-world behavior.

For undocumented protocols, the correct posture is systematic rather than intuitive. Instead of guessing commands, use **command-space enumeration**: have the agent design a brute-force sweep across likely command characters, payload shapes, or state transitions, then map valid responses. Pair this with **TCP proxy protocol analysis**: intercept traffic between vendor software and the device, feed packet logs to the model, and reconstruct the protocol structure from observed behavior.

The mature framework is **progressive protocol discovery**: (1) enumerate commands, (2) capture traffic via man-in-the-middle proxy, (3) identify packet layers and state transitions, (4) reverse engineer checksums or integrity fields, (5) validate against the real device. The agent's strength is not one-shot inference; it is orchestrating this loop autonomously, writing scripts, inspecting outputs, and iterating when hypotheses fail.

The final step is **skillization**. Once the protocol is mapped, the knowledge should not remain as documentation alone. Package it as a reusable AI skill so future users can configure or operate the legacy system through natural language, with the reverse-engineered protocol embedded as an executable capability.

## Key Takeaways

- Use AI for hypothesis design, experiment planning, log analysis, and iteration; keep physical execution human-verified when needed.
- Prefer systematic sweeps and proxy capture over intuition when protocols are undocumented.
- Agentic orchestration is the capability multiplier: write scripts, run tests, inspect results, and refine automatically.
- Package discovered protocol knowledge as reusable skills, not static notes.
- Legacy systems become AI-addressable when their hidden protocols are converted into structured, executable agent capabilities.