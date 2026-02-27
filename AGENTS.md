# AGENTS.md

## Cursor Cloud specific instructions

### Overview

llink.space is a link-in-bio web app (TanStack Start + React 19 + tRPC + Drizzle ORM + PostgreSQL). Single application — no monorepo, no Docker Compose.

### Prerequisites

- **Bun** (package manager & runtime): `curl -fsSL https://bun.sh/install | bash`
- **PostgreSQL 16**: `sudo apt-get install -y postgresql postgresql-client`
- **Node.js 22**: Pre-installed; required by Vitest and Playwright test runners.

### Database setup

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb llink
```

The `.env.local` file needs `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/llink`. After installing deps, run `bun --bun run db:push` to apply the Drizzle schema.

### Key commands

See `README.md` "Scripts" section. Quick reference:

| Task | Command |
|---|---|
| Install deps | `bun install` |
| Dev server (port 3000) | `bun --bun run dev` |
| Lint (Biome) | `bun --bun run lint` |
| Format (Biome) | `bun --bun run format` |
| Unit tests (Vitest) | `bun --bun run test:unit` |
| E2E tests (Playwright) | `bun --bun run test:e2e` |
| Push DB schema | `bun --bun run db:push` |
| Seed sample data | `bun --bun run db:seed` |

### Gotchas

- Bun must be on PATH (`export PATH="$HOME/.bun/bin:$PATH"`). The update script handles this.
- PostgreSQL must be running before the dev server or any DB command. Start with `sudo pg_ctlcluster 16 main start`.
- The Vitest runner (`scripts/run-vitest.sh`) resolves a real Node binary (not Bun's node shim), so Node.js 22 must be available.
- Playwright E2E tests expect a separate `llink_test` database (`postgres://postgres:postgres@127.0.0.1:5432/llink_test`). Create it with `sudo -u postgres createdb llink_test` and push schema via `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/llink_test bun --bun run db:push`.
- Unit tests do not require a database — they test pure utility functions.
- The `.env.local` file is gitignored. Create it with at minimum `DATABASE_URL` and `BETTER_AUTH_SECRET`. See README for full variable list.
