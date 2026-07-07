# Vibey V2

AI Marketing Agency Platform. Each user gets a persistent AI agency that runs their marketing 24/7.

## Stack

- **Frontend:** Next.js 14 + Tailwind CSS + Supabase Realtime
- **Agent Service:** Node.js + OpenClaw-style runtime
- **Database:** Supabase (Postgres + pgvector + Auth + Realtime)
- **Infrastructure:** Single VM (Sprint 1) → Pausable microVMs (Sprint 2+)

## Documentation

All docs live in `.docs/`:

```
.docs/
├── plans/          # Bird's eye, sprint plans, demo guide
├── architecture/   # System architecture, schema, audits, blind spots
├── design/         # UI/UX design, design system, user journey
├── guidelines/     # Development, design, AI, and feature guidelines
└── brand/          # Brand guidelines and persona
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

## License

Private — GoVibey
