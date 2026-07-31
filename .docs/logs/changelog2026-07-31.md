# Changelog - July 31, 2026

## 2026-07-31 12:08 - [FIX]

What: Added a mission-worker Dockerfile-specific ignore file so Railway receives the worker and required workspace packages while excluding unrelated applications and build artifacts.

Why: The shared Fly build ignore file excluded `apps/mission-worker`, causing Railway production builds to find the Dockerfile but fail when copying the worker source.

Impact: Mission-worker Git deployments now use the full required monorepo context without increasing the Fly runtime build context.

Files: `apps/mission-worker/Dockerfile.dockerignore`, `.docs/logs/changelog2026-07-31.md`
