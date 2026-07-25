# Changelog - July 25, 2026

## [2026-07-25 08:22] - [FIX]

What: Added an explicit `copy_approved` handoff for exact-copy IG organic video launches, taught the mission worker to skip only the redundant second confirmation, and added a guarded database migration that updates unchanged skill copies while preserving user-edited variants.
Why: The video skill stopped for copy confirmation even after a user filled the exact-copy form and clicked Create, preventing unattended UI, chat, and mission production from reaching footage and rendering.
Impact: Exact-copy launches can continue directly into video production; agent-written copy still requires human approval. Web payload, worker playbook, and skill migration contract tests pass.
Files: `ig-organic-video.ts`, `ig-organic-video.test.ts`, `ig-organic-video-ad.playbook.ts`, `ig-organic-video-ad.playbook.test.ts`, `ig-organic-video-ad-skill-contract.test.ts`, `20260725153000_ig_organic_video_preapproved_copy.sql`, `social-research.md`
