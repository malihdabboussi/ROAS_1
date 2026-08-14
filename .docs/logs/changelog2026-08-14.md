# Changelog - August 14, 2026

## [2026-08-14 10:33] - [FIX]

What: Pixel `extract_url_transcript` now pulls YouTube/TikTok/Instagram/X/Facebook transcripts through the main API Social Analysis routes before yt-dlp, and failed pulls no longer tell the agent captions are missing or to ask for a paste.

Why: Native captions and yt-dlp are often blocked on the Fly agent-api host, and the previous ScrapeCreators fallback needed `SCRAPECREATORS_API_KEY` on that host. The key already lives on the main API. Users send a video URL in the app and expect Pixel to pull the transcript.

Impact: After native captions miss, Pixel calls `GET /api/integrations/scrapecreators/.../transcript` via `mainApiCall` (credits charged once on the main API). Direct ScrapeCreators remains a last fallback. Agent docs and the failure contract forbid “captions unavailable” / paste-the-transcript replies after a single miss.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript-payload.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, transcript unit tests.
